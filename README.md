# countdown-server
Websocket based server for countdown online game

## Errors
Errors will be sent with a message and an error code. Codes are displayed below, grouped in sections according to which client will receive them.

### Global Error Codes
| Code | Meaning
|------|---------
| 0    | Generic error, display message
| 1    | Invalid message sent
| 2    | Unrecognised message type

### Player Error Codes
| Code | Meaning
|------|---------
| 10    | Invalid username
| 11    | Invalid join code submitted
| 12    | Unable to accept answer

### Host Error Codes
| Code | Meaning
|------|---------
| 20    | Game unable to start
| 21    | Round unable to start
| 22    | Round unable to end (no round in progress)
