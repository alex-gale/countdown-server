// imports
const WebSocket = require('ws')
const https = require('https')
const url = require('url')
const express = require('express')
const http = require('http')

const Game = require('./game_manager')
const logger = require('./lib/logger')

// game container and settings
let games = {}
const MAX_GAMES = 4 

// initialise app & websocket host
const app = express()
const server = http.createServer(app)

const wss = new WebSocket.Server({ server, path: "/ws" })

// decide port based on development/production state
const production = process.env.NODE_ENV === "production"
const port = production ? process.env.port || 3005 : 3050

// function to create a unique identifier for a user
wss.getUniqueID = () => {
    const s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    }

    return s4() + s4()
}

// connection manager
wss.on('connection', (ws, req) => {
    // extract url parameters
    const parameters = url.parse(req.url, true)

    // settings for individual socket connection
    ws.id  = wss.getUniqueID()
    ws.isAlive = true

    // if the connected user is a host
    if (parameters.query.type === "host") {
        // generate a game code
        const game_code = Math.floor((Math.random() * 9000) + 1000).toString()
        ws.game_code = game_code
        ws.type = "host"

        // detect if too many games are being played
        if (Object.keys(games).length >= MAX_GAMES) {
            ws.send(JSON.stringify({ type: "error", data: { code: 0, msg: "Too many games in progress" } }))
            return ws.terminate()
        }

        // add the new game to the game container
        games[game_code] = new Game(game_code)
        games[game_code].set_host(ws)

        // send game container to host client
        ws.send(JSON.stringify({ type: "game_data",	data: { game_code: ws.game_code } }))

        // log the new game
        logger.log(`[${game_code}] Game created`)
    }
    // the connected user is a player
    else {
        ws.type = "player"
        ws.username = parameters.query.username
        const provided_code = parameters.query.code

        // if no username provided
        if (!ws.username) {
            ws.send(JSON.stringify({ type: "error", data: { code: 10, msg: "No username provided" } }))
            return ws.terminate()
        }

        // if game doesn't exist
        if (Object.keys(games).indexOf(provided_code) === -1) {
            ws.send(JSON.stringify({ type: "error", data: { code: 11, msg: "Invalid code"} }))
            return ws.terminate()
        }

        ws.game_code = provided_code

        // add player to relevant game
        games[provided_code].add_player(ws)
    }

    // events ===================

    // if we recieve a pong from our ping, the client is still alive
    ws.on('pong', () => {
        ws.isAlive = true
    })

    // on receiving a message from the client
    ws.on('message', message => {
        let msg_json

        // try to get json data from message
        try {
            msg_json = JSON.parse(message)
        } catch(e) {
            return ws.send(JSON.stringify({ type: "error", data: { code: 1, msg: "Invalid message" } }))
        }

        // extract the type and data from the message
        const { type, data } = msg_json

        // if the client is a host
        if (ws.type == "host") {
            switch (type) {
                case "game_start":
                    games[ws.game_code].start()
                    break
                case "round_end":
                    games[ws.game_code].end_round()
                    break
                case "round_start":
                    games[ws.game_code].start_round()
                    break
                default:
                    ws.send(JSON.stringify({ type: "error", data: { code: 2, msg: "Unrecognised message type" } }))
            }
        }

        // if the client is a player
        else {
            switch (type) {
                case "round_answer":
                    games[ws.game_code].player_answer(ws, data)
                    break
                default:
                    ws.send(JSON.stringify({ type: "error", data: { code: 2, msg: "Unrecognised message type" } }))
            }
        }
    })

    // on client closing (whether forced by us or closed deliberately by player)
    ws.on('close', () => {
        // if host disconnected, terminate all players and delete the game
        if (ws.type == "host") {
            games[ws.game_code].players.forEach(player => {
                player.terminate()
            })

            delete games[ws.game_code]

            logger.log(`[${ws.game_code}] Game removed`)
        }

        // if player disconnected, remove them from their game
        else {
            if (games[ws.game_code]) {
                games[ws.game_code].remove_player(ws.id)
            }
        }
    })
})

// ping pong
const interval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive == false) return ws.terminate()

        ws.isAlive = false
        ws.ping()
    })
}, 5000)

// start server
server.listen(port, () => {
    console.log(`Countdown API started on port ${port}`)
})
