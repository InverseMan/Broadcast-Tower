// npm requires
const MongoClient = require('mongodb').MongoClient
const f = require('util').format
const setTimeoutPromise = require('util').promisify(setTimeout)

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')
const fns = require('./utilities.js')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'

const url = f('mongodb://%s:%s@127.0.0.1:36505/broadcast_tower?authMechanism=%s', user, password, authMechanism)

exports.create = async (msg, bot) => {
	try {
		
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')

		let found = await col.findOne({user: msg.author.id})
		if (found === null) {

			let dmChannel = await msg.author.getDMChannel()

			const userdata = {
				user: msg.author.id,
				status: 'active',
				tagline: '',
				bio: '',
				following: [],
				followers: [],
				blocked: [],
				sendTo: dmChannel.id,
				private: false,
				mature: false,
				dnd: false,
				joined: new Date(),
				eColor: config.color,
				premium: false
			}

			let created = await col.insertOne(userdata)

			if (created.insertedCount === 1) { 
				bot.createMessage(msg.channel.id, f(reply.create.success, msg.author.username))
				fns.log(util.format(reply.create.logSuccess, msg.author.mention), bot)
			} else { 
				bot.createMessage(msg.channel.id, f(reply.create.error, msg.author.username))
				fns.log(util.format(reply.create.logError, msg.author.mention), bot)
			}
		} else {
			bot.createMessage(msg.channel.id, f(reply.create.alreadyHasAccount, msg.author.username))
		}

	} catch (err) {
		fns.log(f(reply.generic.logError, err), bot)
	}
}

const del = async (msg, bot, col) => {
	try {
		//delete user from the followers list of people they're following
		let rem = await col.updateMany({following: msg.author.id}, {$pull: {following: msg.author.id, followers: msg.author.id}})

		fns.log(rem, bot)

		if (rem.result.ok === 1) {

			let del = await col.findOneAndDelete({user: msg.author.id})

			if (del.ok === 1) {
				fns.log(f(reply.close.logSuccess, msg.author.mention), bot)
				bot.createMessage(msg.channel.id, f(reply.close.success, msg.author.username))
			} else {
				fns.log(f(reply.close.logError, msg.author.mention), bot)
				fns.log(f(reply.generic.logError, rem.lastErrorObject), bot)
				bot.createMessage(msg.channel.id, f(reply.close.error, msg.author.username))
			}
		} else {
			fns.log(f(reply.close.logError, rem.lastErrorObject), bot)
			bot.createMessage(msg.channel.id, f(reply.close.error, msg.author.username))
		}


	} catch (err) {
		fns.log(f(reply.generic.logError, err), bot)
	}
}

exports.close = async (msg, bot) => {
	let client = await MongoClient.connect(url)
	const col = client.db(config.db).collection('Users')
	var confirm = fns.rand4Digit()

	const confirmation = async (response) => {
		res = response.content.split(' ')[0];
		if (response.author.id === msg.author.id && res === confirm.toString()) {
        	//confirmation code entered correctly
        	del(msg, bot, col)
        	bot.removeListener('messageCreate', confirmation)
        } else if (response.author.id === msg.author.id && response.content === 'cancel') {
			//user cancelled closing
        	bot.createMessage(msg.channel.id, f(reply.close.cancelled, msg.author.username))
        	bot.removeListener('messageCreate', confirmation)
        } else if (response.author.id === msg.author.id && res !== confirm.toString()) {
        	//confirmation code entered incorrectly
        	bot.createMessage(msg.channel.id, f(reply.close.wrongCode, msg.author.username))
        	bot.removeListener('messageCreate', confirmation)
        }
    }

    let found = await col.findOne({user: msg.author.id})

    if (found === null) {
    	bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
    } else {
    	let delMessage = await bot.createMessage(msg.channel.id, f(reply.close.confirmation, msg.author.username, confirm))

    	bot.on('messageCreate', confirmation)
    	setTimeoutPromise(10000, delMessage.id).then((msgid) => {
    		bot.editMessage(msg.channel.id, msgid, f(reply.close.timeout, msg.author.username))
    		bot.removeListener('messageCreate', confirmation)
    	})
    }
}