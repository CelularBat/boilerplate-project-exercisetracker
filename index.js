const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: String,
  _id: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

const User = mongoose.model('User', userSchema);

//User.remove({},(err,data)=>{});

function CreateNewUser (Username, done){
  id = Math.floor( Math.random()*10000000);
  let user = new User({
    username: Username,
    _id: id,
    count: 0
  });  
  user.save((err, data)=>{
    if (err) {console.log(err)};
    done(null, data);
  });
};

app.post('/api/users',(req, res)=>{
  let user = req.body.username;
  CreateNewUser(user,(err,data)=>{
    res.json({
      username: data['username'],
      _id: data['_id']
    });
  }); 
});

app.get('/api/users',(req,res)=>{
  User.find({}).select({username: 1, _id: 1}).exec((err,data)=>{
      res.json(data);
  });
});

app.post('/api/users/:_id/exercises',(req,res)=>{
  
  let desc = req.body.description;
  let durr = parseInt( req.body.duration,0);
  let dat = req.body.date;
  if (dat===""){
    dat = (new Date()).toDateString(); 
  } else
  {
    dat = (new Date(dat)).toDateString(); 
  }
  let id = req.params._id;
  console.log(id);
  User.findOneAndUpdate({_id: id} ,
  {
    $inc:
      {
        count: 1
      },
    $push:
      {
        log:
          {
            description: desc,
            duration: durr,
            date: dat
          }
      }
  }, {new: true}, (err,data)=>{
    if (err) {return console.log(err)};
    res.json({
      username: data['username'],
      description: desc,
      duration: durr,
      date: dat,
      _id: data['_id']    
    });    
  });
})

app.get('/api/users/:_id/logs',(req,res)=>{
  let id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  
  let addidionalFilteringFlag = true;
  var dateFilter = {};
  if ((from ==="") && (to === "")){
      addidionalFilteringFlag = false;
  }
  if (addidionalFilteringFlag){
    dateFilter={
        date: {
        $gt: (new Date(from)),
        $lt: (new Date(to))
      }
    };
  }
  
  User.findOne({_id: id},(err,data)=>{
      if (err) {return console.log(err)};
      res.json(data);
  })
 // User.findOne({_id: id}).
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
