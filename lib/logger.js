// custom log function
const log = (message, dev = false) => {
	const is_production = process.env.NODE_ENV === "production"

	if (dev && is_production) {
		return
	}

	const date = new Date()
	const dom = ("0" + date.getDate()).slice(-2),
		  month = ("0" + (date.getMonth() + 1)).slice(-2),
		  year = date.getFullYear(),
		  hour = ("0" + date.getHours()).slice(-2),
		  minute = ("0" + date.getMinutes()).slice(-2),
		  second = ("0" + date.getSeconds()).slice(-2)

	const timestamp = `${dom}/${month}/${year} - ${hour}:${minute}:${second}`

	console.log(`[${timestamp}] ${message}`)
}

module.exports = { log }
