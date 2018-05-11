// libraries required
const util = require('util')
const setTimeoutPromise = util.promisify(setTimeout)

// project files required
const config = require('./config.json')   // secrets
const fns = require('./utilities.js') // useful functions
const db = require('./queries.js') // database queries
const reply = require('./proto_messages.json')

/// ///////////////////////////////
// Eval Functions               //
/// /////////////////////////////

// inserts zws character to prevent mentions
const noMention = text => {
    if (typeof (text) === 'string') { return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) } else { return text }
}

// lets owner evaluate code live
exports.beval = async (msg, code, bot) => {
    try {
        let evaled = await eval(code)

        if (typeof evaled !== 'string')
            evaled = require('util').inspect(evaled) 

        bot.createMessage(msg.channel.id, noMention(evaled))
    } catch (err) {
        bot.createMessage(msg.channel.id, `\`\`\`xl\n${noMention(err)}\n\`\`\``)
    }
}

// lets owner evaluate queries live
exports.qeval = async (msg, code, bot) => {
    let res = await db.qeval(code)
    bot.createMessage(msg.channel.id, res)
}

//////////////////////////////////
//Command Functions            //
////////////////////////////////

exports.block = async (msg, blockid, bot) => {
    let removeFromFollowing = await db.pullUserFromList(msg.author.id, 'following', blockid)
    let removeFromFollowers = await db.pullUserFromList(blockid, 'followers', msg.author.id)
    let addToBlocked = await db.pushUserToList(msg.author.id, 'blocked', blockid)

    if (removeFromFollowers === 1 && removeFromFollowing === 1 && addToBlocked === 1) {
        bot.createMessage(msg.channel.id, msg.author.username + ', you have blocked their broadcasts! Please report suspected abuse.')
    } else if (removeFromFollowers === 0 || removeFromFollowing === 0 || addToBlocked === 0) {
        bot.createMessage(msg.channel.id, msg.author.username + ', there was an error blocking that user, please try again later.')
    } else {
        bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
    }
}

exports.unblock = async (msg, unblockid, bot) => {
    let isBlocked = await db.userInList(msg.author.id, 'blocked', unblockid)
    if (isBlocked === 0){
        bot.createMessage(msg.channel.id, 'You have not blocked that user!')
        return
    }

    let removeFromBlocked = await db.pullUserFromList(msg.author.id, 'blocked', unblockid)

    if (removeFromBlocked === 1) {
        bot.createMessage(msg.channel.id, msg.author.username + ', you have unblocked their broadcasts! You must use `b.follow` to recieve their broadcasts again.')
    } else if (removeFromBlocked === 0) {
        bot.createMessage(msg.channel.id, msg.author.username + ', there was an error unblocking that user, please try again later.')
    } else {
        bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
    }
}

exports.setTagline = async (msg, tagline, bot) => {
    let setTaglineText = await db.setField(msg.author.id, 'tagline', tagline)

    if (setTaglineText === 1) {
        bot.createMessage(msg.channel.id, msg.author.username + ', your profile tagline has been set!')
    } else if (setTaglineText === 0) {
        bot.createMessage(msg.channel.id, msg.author.username + ', there was an error setting your tagline, please try again later.')
    } else {
        bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
    }
}

exports.setBio = async (msg, bio, bot) => {
    let setBioText = await db.setField(msg.author.id, 'bio', bio)

    if (setBioText === 1) { bot.createMessage(msg.channel.id, msg.author.username + ', your profile bio has been set!') } else if (setBioText === 0) { bot.createMessage(msg.channel.id, msg.author.username + ', there was an error setting your bio, please try again later.') } else { bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.') }
}

exports.toggleMature = async (msg, bot) => {
    let isMature = await db.getFields(msg.author.id, 'mature')
    var setMature

    if (isMature) {
        let setMature = await db.setField(msg.author.id, 'mature', false)

        if (setMature === 1) {
            bot.createMessage(msg.channel.id, msg.author.username + ', your mature preference has been set! (false)')
        } else if (setMature === 0) {
            bot.createMessage(msg.channel.id, msg.author.username + ', there was an error setting your mature preference, please try again later.')
        } else {
            bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
        }
    } else if (!isMature) {
        let setMature = await db.setField(msg.author.id, 'mature', true)

        if (setMature === 1) {
            bot.createMessage(msg.channel.id, msg.author.username + ', your mature preference has been set! (true))')
        } else if (setMature === 0) {
            bot.createMessage(msg.channel.id, msg.author.username + ', there was an error setting your mature preference, please try again later.')
        } else {
            bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
        }
    } else {
        bot.createMessage(msg.channel.id, msg.author.username + ', sorry an antenna broke somewhere! If this message persists contact Hal.')
    }

}

exports.viewProfile = async (msg, profileid, bot) => {
    let profileData = await db.getFields(profileid, 'all')
    let embed = await fns.profileEmbed(profileData, bot)
    bot.createMessage(msg.channel.id, embed)
}

exports.listUsers = async (msg, list, bot) => {
    let listofUserIDs = await db.getFields(msg.author.id, list)
    let botUser = await bot.getSelf()

    listOfUserNames = []
    for (i = 0; i < listofUserIDs.length; i++) {
        let userobj = await fns.getUserObj(listofUserIDs[i], bot)
        listOfUserNames.push(userobj.username)
    }

    if (list === 'followers')
        title = 'List of ' + msg.author.username + `'s ` + list
    else if (list === 'following')
        title = 'List of users ' + msg.author.username + ' is following'
    else
        title = 'List of users ' + msg.author.username + ' has blocked'

    var embed = {
        embed:{
            title:title,
            description: listOfUserNames.join('\n'),
            author: {
                name: botUser.username,
                icon_url: botUser.avatarURL
            },
            color:config.color,
            footer: {
                text: `Broadcast Tower user's ` + list + ' list'
            }
        }
    }

    return embed
}