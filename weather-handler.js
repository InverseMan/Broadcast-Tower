const weather = require('weather-js');
const f = require('util').format

exports.getWeather = (msg, args, bot) => {
  try {
    if (args.length === 0) {
      bot.createMessage(msg.channel.id, 'please enter a location and degree type')
      return
    }

    let command = args.join(' ')
    let location = command.split('-d')[0].trim()

    let degree = 'F'
    if (command.split('-d')[1] !== undefined) {
      if (command.split('-d')[1].trim().toUpperCase() === 'C' || command.split('-d')[1].trim().toUpperCase() === 'F') {
        degree = command.split('-d')[1].trim().toUpperCase
      } else {
        degree ='F'
      }
    }

    weather.find({search: location, degreeType: degree}, (err, result) => {
      if(err) {
        bot.createMessage(msg.channel.id, err)
        return
      }

      let embed = {
        embed: {
            author: {name: f("Current Weather in %s", result[0].location.name), icon_url: result[0].current.imageUrl},
            color: parseInt('0x4286f4', 16),
            description: f("Temperature: **%s**\nFeels like: **%s**\nSky: **%s**\nWind: **%s**\n", result[0].current.temperature + degree, result[0].current.feelslike + degree, result[0].current.skytext, result[0].current.winddisplay),
            footer: {text:'Part of the Broadcast Tower Integration Network'}
        }
      }

      bot.createMessage(msg.channel.id, embed)
    })
  } catch (e) {
    console.log(e)
  }
}

exports.getForecast = (msg, args, bot) => {
  try {
    if (args.length === 0) {
      bot.createMessage(msg.channel.id, 'please enter a location and degree type')
      return
    }

    let command = args.join(' ')
    let location = command.split('-d')[0].trim()

    let degree = 'F'
    if (command.split('-d')[1] !== undefined) {
      if (command.split('-d')[1].trim().toUpperCase() === 'C' || command.split('-d')[1].trim().toUpperCase() === 'F') {
        degree = command.split('-d')[1].trim()
      } else {
        degree ='F'
      }
    }

    weather.find({search: location, degreeType: degree}, (err, result) => {
      if(err) {
        bot.createMessage(msg.channel.id, err)
        return
      }

      let fields = []
      for (i in result[0].forecast) {
        if (result[0].forecast[i].percip === '')
          var percip = '0%'
        else
          var pericp = result[0].forecast[i].percip + '%'

        fields.push({name:result[0].forecast[i].day + f(' the %sth', result[0].forecast[i].date.slice(8)),
          value: f('High: **%s**\nLow: **%s**\nSky: **%s**\nPercipitation: **%s**',
            result[0].forecast[i].high + degree, result[0].forecast[i].low + degree, result[0].forecast[i].skytextday, percip),
          inline:true
        })
      }

      let embed = {
        embed: {
            author: {name: f("Weather forecast in %s for the next 5 days", result[0].location.name), icon_url: result[0].current.imageUrl},
            color: parseInt('0x4286f4', 16),
            fields: fields,
            footer: {text:'Part of the Broadcast Tower Integration Network'}
        }
      }

      bot.createMessage(msg.channel.id, embed)
    })
  } catch (e) {
    console.log(e)
  }
}