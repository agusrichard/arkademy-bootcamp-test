const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getUserId } = require('../utils')

async function signup(parent, args, context, info) {
  const password = await bcrypt.hash(args.password, 10)
  const user = await context.prisma.user.create({
    data: {
      email: args.email,
      password: args.password,
      name: args.name
    }
  })
  const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY)

  return { token, user }
}

async function login(parent, args, context, info) {
  const user = await context.prisma.user.findOne({
    where: { email: args.email }
  })
  if (!user) {
    throw new Error('No such user found')
  }

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY)

  return { token, user }
}

async function post(parent, args, context, info) {
  const userId = getUserId(context)
  const newLink = await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description,
      postedBy: { connect: { id: userId } }
    }
  })
  context.pubsub.publish('NEW_LINK', newLink)
  return newLink
}


async function updateLink(parent, args, context, info) {
  return 'updateLink resolver function'
}

async function deleteLink(parent, args, context, info) {
  return 'deleteLink resolver function'
}

async function vote(parent, args, context, info) {
  const userId = getUserId(context)

  const vote = await context.prisma.vote.findOne({
    where: {
      linkId_userId: {
        linkId: Number(args.linkId),
        userId: userId
      }
    }
  })

  if (Boolean(vote)) {
    throw new Error(`Already voted for link: ${args.linkId}`)
  }

  const newVote = context.prisma.vote.create({
    data: {
      user: { connect: { id: userId } },
      link: { connect: { id: Number(args.linkId) } }
    }
  })
  context.pubsub.publish('NEW_VOTE', newVote)
  return newVote
}

module.exports = { 
  signup, 
  login, 
  post,
  updateLink,
  deleteLink,
  vote
}