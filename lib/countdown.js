//
// Countdown Functions
//

const dictionary = require('./dictionary')

const vowels = "AAAAAAAAAAAAAAAEEEEEEEEEEEEEEEEEEEEEIIIIIIIIIIIIIOOOOOOOOOOOOOUUUUU"
const consonants = "BBCCCDDDDDDFFGGGHHJKLLLLLMMMMNNNNNNNNPPPPQRRRRRRRRRSSSSSSSSSTTTTTTTTTVWXYZ"

// array shuffler
const arr_shuffle = (a) => {
    var n = a.length

    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }
}

// string shuffler
const str_shuffle = (s) => {
    var a = s.split("")
    arr_shuffle(a)
    return a.join("")
}

// generate 9 random letters
const generateLetters = () => {
    let letters = ""
    let ncons = 0
    let nvowels = 0

    let cons_shuffled = str_shuffle(consonants)
    let vowels_shuffled = str_shuffle(vowels)

    const add_vowel = () => {
        const v = vowels_shuffled.substring(0, 1)
        vowels_shuffled = vowels_shuffled.substring(1)
        letters += v
        nvowels += 1
    }

    const add_consonant = () => {
        const c = cons_shuffled.substring(0, 1)
        cons_shuffled = cons_shuffled.substring(1)
        letters += c
        ncons += 1
    }

    while (letters.length < 9) {
        if (ncons >= 6) {
            add_vowel()
        }
        else if (nvowels >= 5) {
            add_consonant()
        }
        else {
            Math.random() < 0.5 ? add_vowel() : add_consonant()
        }
    }

    return letters
}

// detect if a word is in the dictionary defined in dictionary.js
const word_in_dictionary = (word) => {
    var node = dictionary
    var idx = 0

    while (idx < word.length) {
        node = node[word.charAt(idx)]
        idx += 1
        if (!node){
            return false
        }
    }

    if (!node[0]) {
        return false
    }

    return true
}

// detect if letters in word match given 9 letters
const correct_letters = (letters, word) => {
    let count = {}

    for (letter of letters) {
        if (!count[letter]) {
            count[letter] = 0
        }

        count[letter] += 1
    }

    for (letter of word) {
        if (!count[letter]) {
            return false
        }

        count[letter] -= 1

        if (count[letter] < 0) {
            return false
        }
    }

    return true
}

// generate feedback for a user's answer
const feedback_answer = (letters, word) => {
    let feedback = { dict: false, letters: false, top_answer: false }

    if (word_in_dictionary(word)) {
        feedback.dict = true
    }

    if (correct_letters(letters.toLowerCase(), word)) {
        feedback.letters = true
    }

    return feedback
}

// internal function find all solutions to a 9 letter challenge
const _recursive_solve_letters = (letters, node, used_letter, callback, answer) => {
    if (node[0]) callback(answer, node[0])
    if (answer.length === letters.length) return

    let done = {}

    for (let i = 0; i < letters.length; i++) {
        let c = letters.charAt(i)

        if (used_letter[i] || done[c]) continue

        if (node[c]) {
            used_letter[i] = true
            done[c] = true
            _recursive_solve_letters(letters, node[c], used_letter, callback, answer + c)
            used_letter[i] = false
        }
    }
}

// caller for _recursive_solve_letters
const solve_letters = (letters, callback) => {
    _recursive_solve_letters(letters, dictionary, {}, callback, "")
}

module.exports = { generateLetters, feedback_answer, solve_letters }
