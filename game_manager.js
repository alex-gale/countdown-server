const { generateLetters, feedback_answer, solve_letters } = require('./lib/countdown')
const logger = require('./lib/logger')

class Game {
    constructor(game_code) {
        this.host = null
        this.players = []
        this.saved_scores = {}
        this.GAMECODE = game_code
        this.started = false
        this.letters = ""
    }

    // set host client
    set_host(host) {
        this.host = host
    }

    // send message to all clients
    send_global(message) {
        this.host.send(message)
        this.players.forEach(player => {
            player.send(message)
        })
    }

    // start game
    start() {
        // if game already in progress
        if (this.started) {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 20, msg: "Game already in progress" } }))
        }

        // if there are no players
        if (this.players.length < 1) {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 20, msg: "No players connected" } }))
        }

        this.started = true
        this.start_round()
    }

    // start a round
    start_round() {
        // if game not started (still on connecting screen)
        if (!this.started) {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 21, msg: "Game has not started yet"} }))
        }

        // if there are no players
        if (this.players.length < 1) {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 21, msg: "No players connected" } }))
        }

        // if letters are set, then a round is in progress
        if (this.letters !== "") {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 21, msg: "Round already in progress" } }))
        }

        // set the letters randomly
        this.letters = generateLetters()

        // tell all users round has begun
        this.send_global(JSON.stringify({ type: "round_start", data: { letters: this.letters } }))
    }

    // end current round
    end_round() {
        // if there is no round to end (letters are set)
        if (this.letters == "") {
            return this.host.send(JSON.stringify({ type: "error", data: { code: 22, msg: "No round in progress" } }))
        }

        // tell all users round has ended
        this.send_global(JSON.stringify({ type: "round_end" }))

        // round feedback and scoring
        let valid_answers = {}

        // generate feedback for all players
        this.players.forEach(player => {
            const feedback = feedback_answer(this.letters, player.current_answer)

            // if the feedback says the dictionary and letters are legal, add their answer to valid_answers
            if (feedback.dict && feedback.letters) {
                valid_answers[player.id] = player.current_answer
            }

            player.feedback = feedback
        })

        let best_length = 0

        // find the longest word in valid_answers
        if (Object.keys(valid_answers).length > 0) {
            const lengths = Object.values(valid_answers).map(a => a.length)
            best_length = Math.max(...lengths)
        }

        console.log(best_length)

        //send messages to all players
        for (const player of this.players) {
            // give player a score if they had a top answer
            if (player.current_answer.length === best_length && player.feedback.dict && player.feedback.letters) {
                player.feedback.top_answer = true
                player.score += player.current_answer.length
            }

            // send player their feedback and reset their answer
            player.send(JSON.stringify({ type: "round_feedback", data: { feedback: player.feedback } }))
            player.current_answer = ""
        }

        // get list of best words
        let best_words = []
        solve_letters(this.letters.toLowerCase(), word => best_words.push(word))

        // sort the best words by length and get the top 10
        best_words = best_words.sort((a, b) => {
            if (a.length < b.length) return 1
            if (a.length > b.length) return -1
            return 0
        }).slice(0, 10)

        // send results and best words to host
        this.host.send(JSON.stringify({ type: "round_results", data: { valid_answers, best_words } }))

        this.letters = ""
    }

    // add player client to game
    add_player(player) {
        // deny player joining if username already in use
        const player_existing = this.players.find(p => p.username.toLowerCase() == player.username.toLowerCase())
        if (player_existing) {
            player.send(JSON.stringify({ type: "error", data: { code: 10, msg: "Username already in use" } }))
            player.terminate()
        }

        // default player data
        player.current_answer = ""
        player.feedback = {}
        player.score = 0

        // recover score if player was disconnected
        let lower_username = player.username.toLowerCase()
        if (Object.keys(this.saved_scores).indexOf(lower_username) > -1) {
            player.score = this.saved_scores[lower_username]
            delete this.saved_scores[lower_username]
        }

        // add player to list of players
        this.players.push(player)

        // send player their data
        player.send(JSON.stringify({
            type: "game_data",
            data: {
                username: player.username,
                score: player.score,
                game_code: player.game_code
            }
        }))

        // send host player data
        this.host.send(JSON.stringify({
            type: "player_join",
            data: {
                player_id: player.id,
                player_username: player.username,
                player_score: player.score
            }
        }))
    }

    // remove a player
    remove_player(playerid) {
        // get player client by id
        const player = this.players.find(p => p.id === playerid)

        // save player's score
        this.saved_scores[player.username.toLowerCase()] = player.score

        // remove player from list
        this.players = [...this.players].filter(p => p.id !== playerid)

        // tell host that player has disconnect, if they still exist
        if (this.host) {
            this.host.send(JSON.stringify({
                type: "player_disconnect",
                data: { player_id: playerid }
            }))
        }

        // end round if the player disconnecting means that all players have answered
        if (this.started && this.letters !== "" && !this.players.find(p => p.current_answer == "")) {
            this.end_round()
        }
    }

    // accept a player answer during a round
    player_answer(player, answer) {
        // if there is no round in progress (no letters set)
        if (this.letters == "") {
            return player.send(JSON.stringify({ type: "error", data: { code: 12, msg: "No round in progress." } }))
        }

        // if player has submitted a blank answer
        if (!answer) {
            return player.send(JSON.stringify({ type: "error", data: { code: 12, msg: "Answer cannot be blank." } }))
        }

        // if player has already submitted an answer
        if (player.current_answer !== "") {
            return player.send(JSON.stringify({ type: "error", data: { code: 12, msg: "Answer submitted already." } }))
        }

        answer = answer.toLowerCase()

        // lock player's answer in for this round
        player.current_answer = answer
        player.send(JSON.stringify({ type: "answer_confirm", data: player.current_answer }))

        // tell the host that the player has answered
        this.host.send(JSON.stringify({
            type: "player_answer",
            data: {
                player_id: player.id,
                answer: answer
            }
        }))

        // if there are no players with a blank answer
        if (!this.players.find(p => p.current_answer == "")) {
            this.end_round()
        }
    }
}

module.exports = Game
