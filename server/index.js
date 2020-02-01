const keys = require('./keys')

// Express app setup
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors()) // allow requests from one domain to another
app.use(bodyParser.json()) // parse incoming requests into json

// Postgres client setup
const { Pool } = require('pg')
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

pgClient.on('error', () => console.log('Lost PG connection'))

// Create initial table to store indices that have been seen
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err))

// Redis client setup
const redis = require('redis')
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})

// Need to make duplicate connection b/c when publishing, can't handle other actions
const redisPublisher = redisClient.duplicate()

// Express route handlers

app.get('/', (req, res) => {
    res.send('Hi')
})

// Get all values stored in our DB
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values')

    res.send(values.rows)
})

// Get all current values stored in Redis
app.get('/values/current', async (req, res) => {
    //hget is for hashes; values is our key
    // No promise support for redis so this syntax
    redisClient.hgetall('values', (err, values) => {
        res.send(values)
    })
})

app.post('/values', async (req, res) => {
    const index = req.body.index

    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high')
    }

    redisClient.hset('values', index, 'Nothing yet!')
    // Insert index into redis
    redisPublisher.publish('insert', index)
    // Insert index into PG; $1 is string interpolation. Prevents sql injection
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index])

    res.send({working: true})
})

app.listen(5000, err => {
    console.log("Listening")
})