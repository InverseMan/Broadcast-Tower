const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const bodyParser = require('body-parser')
const request = require('superagent')


// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'
const url = f('mongodb://%s:%s@127.0.0.1:36505/broadcast_tower?authMechanism=%s', user, password, authMechanism)



exports.getReleases = async () => {
	let data = config.spotifyID + ':' + config.spotifySecret;  
	let buff = new Buffer.from(data);  
	let base64data = buff.toString('base64');


	try {
		let client = await MongoClient.connect(url)
		const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')

		let prepare = await spotifyCol.drop() //throw out the top releases list in prep for the new one

		let response = await request.post('https://accounts.spotify.com/api/token')
		.send({grant_type:'client_credentials'})
		.set('Authorization', 'Basic ' + base64data)
		.type('application/x-www-form-urlencoded')

		let data = JSON.parse(response.text)
		let token = 'Bearer ' + data.access_token

		let position = 1
		for (i = 0; i < 2; i++) {
			let getResponse = await request.get('https://api.spotify.com/v1/browse/new-releases?limit=50&offset=' + 50*i)
			.set('Authorization', token)

			let top50newReleasesRAW = JSON.parse(getResponse.text)
			let info = top50newReleasesRAW.albums

			let albums = []
			for (album in info.items) {
				let record = {
					position: position,
					name: info.items[album].name,
					artist: info.items[album].artists[0].name,
					artist_url: info.items[album].artists[0].href,
					album_url: info.items[album].external_urls.spotify,
					image_url_300: info.items[album].images[1].url,
					release_date: info.items[album].release_date 
				}
				albums.push(record)
				position += 1
			}

			let pushAlbums = await spotifyCol.insertMany(albums)
			if (pushAlbums.insertedCount !== albums.length)
				console.log('Not all albums were pushed: ' + pushAlbums.insertedCount)
			else
				console.log('50 albums pusehd to db')
		}

	} catch (e) {
		console.log(e)
	}
}

exports.getAlbum = async (position) => {
	try {
		let client = await MongoClient.connect(url)
		const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')

		let album = await spotifyCol.findOne({position:position})
		return album
	} catch (err) {
		return err
	}
}

exports.tenList = async (msg, args, bot) => {
	let client = await MongoClient.connect(url)
	const spotifyCol = client.db(config.db).collection('SpotifyNewReleases')
	let offset = 0

	if (args.length > 0) {
		let num = parseInt(args[0])
		
		if (num < 1 || num > 10) {
			bot.createMessage(msg.channel.id, f('%s, woah out of range buddy, number must be from 1 - 10'), msg.author.username)
			return
		}

		offset = 10 * (num - 1)
	} 

	//get the album from the database
	spotifyCol.find({position:{$lte:offset}}).toArray((err, docs) => {
		let fields = []
		for (i = 0; i < docs.length; i++) {
			fields.push({title: albums[0].postition, value:f('%sArtist: **%s** | Album: [%s](%s)', albums[0].artist, albums[0].name, albums[0].album_url), inline: false})
		}

		let embed = {
			embed: {
				author: {name: 'Spotify New Releases', icon_url: 'https://beta.developer.spotify.com/assets/branding-guidelines/icon4@2x.png' },
				color: parseInt('0x1DB954', 16),
				fields: fields,
				footer: {text:'Part of the Broadcast Tower Integration Network'}
			}
		}

		bot.createMessage(msg.channel.id, embed)
	})
}