const keys = require('./keys')
const redis = require('redis')

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})

//Subscription
const sub = redisClient.duplicate()

// Slow fib solution so our process makes more sense
const fib = (index) => {
    if (index < 2) {
        return 1
    }

    res = fib(index-1) + fib(index-2)
    // console.log("[Worker] has calculated: ", parseInt(res))
    return res
}

sub.on('message', (channel, message) => {
    // Set on a hash of values, w/ key index (message) and push the value we get
    // console.log("[Worker] recieved a message")
    redisClient.hset('values', message, fib(parseInt(message)))
})

// Subscribe to any insert event
sub.subscribe('insert')