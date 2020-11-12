'use strict';

require('dotenv').config();

const express = require('express');
const pg = require('pg'); //connects and provides tools to be used between server and DB
const superagent = require('superagent');
const dotenv = require('dotenv');
const cors = require('cors');
// const seqlFile = require('./schema.sql');
const client = new pg.Client(process.env.DATABASE_URL) //my app is a client to my db, should be private and unique to wherever it is deployed to (heroku)

//BUILD A ROUTE TO SAVE REQUEST

// BUILD A ROUTE TO RETRIEVE

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
//using keys stored in kept in .env
const GEO_API_KEY = process.env.GEO_API_KEY;
// const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
// const TRAIL_API_KEY = process.env.TRAIL_API_KEY;


app.use(cors());

app.get('/location', handleLocation);
// app.get('/weather', handleWeather);
// app.get('/trails', handleTrails);

// CATCH ALL
app.get('*', notFoundHandler);

// :::::::::::: HANDLERS ::::::::::::::

function handleLocation(request, response) {
  try {

    let city = request.query.city;
    let url = `https://us1.locationiq.com/v1/search.php?key=${GEO_API_KEY}&q=${city}&format=json&limit=1`;

    client.query('SELECT * FROM location WHERE city = $1;', [city])
      .then(info => {
        console.log(info.rows)
        let notExist = info.rows.forEach(storedObj => storedObj.city !== city);

        console.log('not exist: ', notExist);
        if (notExist === true) {

          let locations = {};
          // ADD INFO TO DB USING SQL
          // RETRIEVE INFO FROM DB USING SQL
          superagent.get(url)
            .then(data => {
              let locationInfo = data.body[0];
              // console.log(locationInfo);
              let locationObj = new Location(city, locationInfo);
              // console.log(locationObj);
              locations[url] = locationObj
              let SQL = 'INSERT INTO location (city, city_info, lat, lon) VALUES ($1, $2, $3, $4) RETURNING *;';
              let values = [locationObj.search_query, locationObj.formatted_query, locationObj.latitude, locationObj.longitude];

              client.query(SQL, values)
                .then(result => {
                  // console.log('this is newly stored object in return:', result.rows);
                  // result.status(201).json(result.rows);
                })

              response.json(locationObj);
            });
        } else {
          response.json(info.rows);
        }
      });

  } catch (error) {
    console.log('error! it did not work');
  }
}

// ::::::::: HANDLE WEATHER :::::::::::

// :::::::::: FIX THIS SHIT!!! ::::::::::::::::::

function handleWeather(request, response) {
  try {
    let city = request.query.city;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API_KEY}&days=8`;
    // let weather = {};

    superagent.get(url)
      .then(weatherData => {
        let daysWeather = weatherData;
        console.log(daysWeather);
        // daysWeather.map(dayData =>
        //   new Forecast(dayData));
        // weather[url] = daysWeather;
        response.json(daysWeather);
      });
  } catch (error) {
    console.log('error! it did not work');
  }

}




// ADD TRAIL HANDLER HERE

// ::::::::::: CONSTRUCTORS ::::::::::::

function Location(city, locationInfo) {
  this.search_query = city;
  this.formatted_query = locationInfo.display_name;
  this.latitude = locationInfo.lat;
  this.longitude = locationInfo.lon;
}

function Forecast(dayData) {

  this.time = value.valid_date;
  this.forecast = value.weather.description;

}

// TRAIL CONSTRUCTOR HERE

function notFoundHandler(request, response) {
  response.status(404).send('not found');
}

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is up! ${PORT}`);
    });
  })

