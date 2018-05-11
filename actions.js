// npm requires
const MongoClient = require('mongodb').MongoClient
const f = require('util').format

// project files required
const config = require('./config.json')
const reply = require('./proto_messages.json')
const fns = require('./utilities.js')

// mongodb login
const user = encodeURIComponent(config.user)
const password = encodeURIComponent(config.pass)
const authMechanism = 'DEFAULT'

const url = f('mongodb://%s:%s@127.0.0.1:36505/broadcast_tower?authMechanism=%s', user, password, authMechanism)

const safetyChecks = async (msg, secondID, col, bot) => {
	
	if (secondID === -1) {
		bot.createMessage(msg.channel.id, f(reply.generic.invalidID, msg.author.username, msg.content.split(' ')[1]))
		return false
	}

	if (secondID === msg.author.id) {
		bot.createMessage(msg.channel.id, f(reply.generic.cannotDoToSelf, msg.author.username))
		return false
	}

	let isBot = await bot.users.get(secondID)
	if (isBot === undefined) {
		bot.createMessage(msg.channel.id, f(reply.generic.userUnknown, msg.author.username, msg.content.split(' ')[1]))
		return false
	} else if (isBot.bot){
		bot.createMessage(msg.channel.id, f(reply.generic.cannotDoToBots, msg.author.username))
		return false
	}

	let followeeHasAccount = await col.findOne({user: secondID})

	if (followeeHasAccount === 0) {
		let secondUsername = await fns.getUsername(secondID, bot)
		bot.createMessage(msg.channel.id, f(reply.generic.UserNoAccount, msg.author.username, secondUsername))
		return false
	}

  //checks passed
  return true
}

exports.follow = async(msg, args, bot) => {
	try {
		//database
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')

		//check is usee is a user
		let found = await col.findOne({user: msg.author.id})
		if (found === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}
		
		//check for undesirable conditions
		let secondID = fns.isID(args[0])
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab their username
		let second = await fns.getUsername(secondID, bot)

		//already following
		let isInList = col.findOne({user: msg.author.id, following: secondID})
		fns.log(isInList, bot)
		if (isInList !== null) {
			bot.createMessage(msg.channel.id, f(reply.follow.already, msg.author.username, second))
			let beSure = await col.findOneAndUpdate({user: secondID}, {$addToSet: {following: msg.author.id}})
			return
		}

		//you blocked them!
		let isBlocked = await col.findOne({user: msg.author.id}, {blocked: secondID})
		if (isBlocked) {
			bot.createMessage(msg.channel.id, f(reply.follow.followeeBlocked, msg.author.username, second))
			return
		}

		//they blocked you!
		let theyBlocked = await col.findOne({user:secondID}, {blocked: msg.author.id})
		if (theyBlocked) {
			bot.createMessage(msg.channel.id, f(reply.follow.followeeBlocked, second, msg.author.username))
			return
		}

    	// if not following
    	let addToFollowing = await col.findOneAndUpdate({user: usermsg.author.id}, {$addtoset: {following: followid}})
    	let addToFollowers = await col.findOneAndUpdate({user: followid}, {$addtoset: {followers: msg.author.id}})
    	if (addToFollowers.result.ok === 1 && addToFollowing.result.ok) {
    		fns.log(f(reply.follow.logError), bot)
    		bot.createMessage(msg.channel.id, f(reply.follow.success, msg.author.username, second))
    	} else {
    		fns.log(f(reply.general.logError, addToFollowers.lastErrorObject), bot)
    		fns.log(f(reply.general.logError, addToFollowing.lastErrorObject), bot)
    		bot.createMessage(msg.channel.id, f(reply.follow.error, msg.author.username, second))
    	}
    } catch (err) {
    	fns.log(f(reply.generic.logError, err), bot)
    }
}

exports.unfollow = async(msg, bot) => {
	try {
		//database
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')

		//check is usee is a user
		let found = await col.findOne({user: msg.author.id})
		if (found === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
			return
		}
		
		//check for undesirable conditions
		let secondID = fns.isID(args[0])
		let safe = await safetyChecks(msg, secondID, col, bot)
		if (!safe)
			return	//something was wrong with the input and the user was told

		//grab their username
		let second = await fns.getUsername(secondID, bot)

		//is not in list
		let isInList = col.findOne({user: msg.author.id, following: secondID})
		if (isInList === null) {
			bot.createMessage(msg.channel.id, f(reply.unfollow.notFollowing, msg.author.username, second))
			let beSure = await col.findOneAndUpdate({user: secondID}, {$pull: {followers: msg.author.username}})
			return
		}

		//unfollow
		let remFromFollowing = await col.findOneAndUpdate({user: msg.author.id}, {$pull: {following: followid}})
    	let remFromFollowers = await col.findOneAndUpdate({user: followid}, {$pull: {followers: msg.author.id}})
    	if (remFromFollowers.result.ok === 1 && remFromFollowing.result.ok) {
    		fns.log(f(reply.follow.logError), bot)
    		bot.createMessage(msg.channel.id, f(reply.unfollow.success, msg.author.username, second))
    	} else {
    		fns.log(f(reply.general.logError, remFromFollowing.lastErrorObject), bot)
    		fns.log(f(reply.general.logError, remFromFollowers.lastErrorObject), bot)
    		bot.createMessage(msg.channel.id, f(reply.unfollow.error, msg.author.username, second))
    	}

	} catch (err) {
		fns.log(f(reply.generic.logError, err), bot)
	}
}

exports.block = async(msg, bot) => {
	try {
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')

		let found = await col.findOne({user: msg.author.id})

		if (found === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
		} else {

		}
	} catch (err) {

	}
}

exports.unblock = async(msg, bot) => {
	try {
		let client = await MongoClient.connect(url)
		const col = client.db(config.db).collection('Users')

		let found = await col.findOne({user: msg.author.id})

		if (found === null) {
			bot.createMessage(msg.channel.id, f(reply.generic.useeNoAccount, msg.author.username))
		} else {

		}
	} catch (err) {

	}
}