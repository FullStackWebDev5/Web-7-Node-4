const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('view engine', 'ejs')

// MIDDLEWARE
// Authentication
const isLoggedIn = (req, res, next) => {
  try {
    const { jwttoken } = req.headers
    const user = jwt.verify(jwttoken, process.env.JWT_SECRET)
    req.user = user
    next()
  } catch (error) {
    console.log(error)
    res.json({ 
      status: 'FAILED',
      message: "You've not logged in! Please login"
    })
  }
}

// Authorization
const isPremium = (req, res, next) => {
  if(req.user.isPremium) {
    next()
  } else {
    res.json({ 
      status: 'FAILED',
      message: "You're not a premium user! Please buy premium plan"
    })
  }
}

const User = mongoose.model('User', {
  fullName: String,
  email: String,
  password: String,
  isPremium: Boolean
})

// PUBLIC ROUTE
app.get('/', (req, res) => {
  res.json({
    status: 'SUCCESS',
    message: 'All good!'
  })
})

// PRIVATE ROUTE
app.get('/dashboard', isLoggedIn, async (req, res) => {
  res.send('WELCOME TO DASHBOARD PAGE!')
})

app.get('/premium', isLoggedIn, isPremium, async (req, res) => {
  res.send('WELCOME TO PREMIUM PAGE!')
})

app.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
    res.json({
      status: 'SUCCESS',
      data: users
    })
  } catch (error) {
    res.json({ 
      status: 'FAILED',
      message: 'Something went wrong'
    })
  }
})

app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, isPremium } = req.body
    const encryptedPassword = await bcrypt.hash(password, 10)
    await User.create({ fullName, email, password: encryptedPassword, isPremium })
    res.json({
      status: 'SUCCESS',
      message: "You've signed up successfully!"
    })
  } catch (error) {
    console.log(error)
    res.json({ 
      status: 'FAILED',
      message: 'Something went wrong'
    })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if(user) {
      let hasPasswordMatched = await bcrypt.compare(password, user.password)
      if(hasPasswordMatched) {
        const jwtToken = jwt.sign(user.toJSON(), process.env.JWT_SECRET, { expiresIn: 60*30 })
        res.json({
          status: 'SUCCESS',
          message: "You've logged in successfully!",
          jwtToken
        })
      } else {
        res.json({ 
          status: 'FAILED',
          message: 'Incorrect credentials! Please try again'
        })
      }
    } else {
      res.json({ 
        status: 'FAILED',
        message: 'User does not exist'
      })
    }
  } catch (error) {
    console.log(error)
    res.json({ 
      status: 'FAILED',
      message: 'Incorrect credentials! Please try again'
    })
  }
})

app.listen(process.env.PORT, () => {
  mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => console.log(`Server running on http://localhost:${process.env.PORT}`))
    .catch(error => console.error(error))
})


/*
  ## Authentication vs Authorization
  Authentication: Verify user's identity (Who are you?)
  Authorization: Verify user's access (What access do you have?)

  ## bcrypt - Encrypt the password
  ## JWT (JSON Web Token): https://www.vaadata.com/blog/wp-content/uploads/2016/12/JWT_tokens_EN.png

  // Simple middleware example to check if user is logged in -
  const isLoggedIn = (req, res, next) => {
    let loggedIn = true
    if(loggedIn) {
      next()
    } else {
      res.json({ 
        status: 'FAILED',
        message: "You've not logged in! Please login"
      })
    }
  }

  // Encryption and decryption example
  Encryption
  ANKIT - Original text
  CPMKV - Encrypted text

  Decryption
  CPMKV - Encrypted text
  ANKIT - Original text
*/