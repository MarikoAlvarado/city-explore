'use strict';

require('dotenv').config();

const express = require('express');
const pg = require('pg'); //connects and provides tools to be used between server and DB
const superagent = require('superagent');
const dotenv = require('dotenv');
const cors = require('cors');
// const seqlFile = require('./schema.sql');
const client = new pg.Client(process.env.DATABASE_URL) //my app is a client to my db, should be private and unique to wherever it is deployed to (heroku)

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEO_API_KEY = process.env.GEO_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const TRAIL_API_KEY = process.env.TRAIL_API_KEY;


app.use(cors());

app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/trails', handleTrails);
app.get('*', notFoundHandler);

// :::::::::::: HANDLERS ::::::::::::::

function handleLocation(request, response) {
  try {

    let city = request.query.city;
    let url = `https://us1.locationiq.com/v1/search.php?key=${GEO_API_KEY}&q=${city}&format=json&limit=1`;
    client.query('SELECT * FROM location WHERE search_query = $1;', [city])
      .then(storedObj => {
        let list = storedObj.rows;
        if (list.length > 0) {
          return response.send(list[0]);
        } else {
          superagent.get(url)
            .then(data => {
              let locationInfo = data.body[0];
              let locationObj = new Location(city, locationInfo)
              return locationObj
            })
            .then(store => {
              let SQL = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *;';
              let values = [store.search_query, store.formatted_query, store.latitude, store.longitude];

              client.query(SQL, values)
              response.json(store);
            });
        }
      })
  } catch (error) {
    console.log('error! it did not work');
  }
}
// :::::::::::::::::::: HANDLE WEATHER ::::::::::::::::::::::::

function handleWeather(request, response) {
  try {

    let cityWeather = request.query.search_query;
    console.log(cityWeather);
    let weatherUrl = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityWeather}&key=${WEATHER_API_KEY}&days=8`;
    superagent.get(weatherUrl)
      .then(weatherData => {
        let weatherInfo = weatherData.body.data;
        let weatherInfoData = weatherInfo.map(info => {
          // console.log('this is just data, no city ', info.weather);
          return new Forecast(info)
        })
        return response.status(200).json(weatherInfoData);
      })

  } catch (error) {
    response.status(500).send('error! it did not work');
  }
}

function handleTrails(request, response) {
  try {

    let trailsLat = request.query.latitude;
    let trailsLon = request.query.longitude;
    let trailsUrl = `https://www.hikingproject.com/data/get-trails?lat=${trailsLat}&lon=${trailsLon}&key=${TRAIL_API_KEY}&maxRusults=1`;
    superagent.get(trailsUrl)
      .then(trailsData => {
        // console.log('92 ', trailsData.body.trails);
        let trailsInfo = trailsData.body.trails;
        let trailsInfoData = trailsInfo.map(info => {
          console.log('95 ', trailsInfo);
          return new Trails(info)
        })
        return response.status(200).json(trailsInfoData);
      })

  } catch (error) {
    response.status(500).send('error! it did not work');
  }
}
// :::::::::::::::::::::::::::: CONSTRUCTORS ::::::::::::::::::::::::::::::::::::::

function Location(city, locationInfo) {
  this.search_query = city;
  this.formatted_query = locationInfo.display_name;
  this.latitude = locationInfo.lat;
  this.longitude = locationInfo.lon;
}

function Forecast(weatherInfo) {
  this.forecast = weatherInfo.weather.description;
  this.time = weatherInfo.datetime;
}

function Trails(info) {
  this.name = info.name;
  this.location = info.location;
  this.length = info.length;
  this.stars = info.stars;
  this.star_votes = info.starVotes;
  this.summary = info.summary;
  this.trail_url = info.url;
  this.conditions = info.conditionStatus;
  this.condition_date = info.conditionDate;
  this.condition_time = info.conditionDetails;
}
function notFoundHandler(request, response) {
  response.status(404).send('not found');
}

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is up! ${PORT}`);
    });
  })
