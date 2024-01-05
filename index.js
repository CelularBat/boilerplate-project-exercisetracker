const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

let mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const userSchema = new mongoose.Schema({
  username: String,
  _id: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      date: Date,
    },
  ],
});

const User = mongoose.model("User", userSchema);

//User.remove({},(err,data)=>{console.log('database cleaned')});

function CreateNewUser(Username, done) {
  var id = Math.floor(Math.random() * 10000000);
  let user = new User({
    username: Username,
    _id: id,
    count: 0,
  });
  user.save((err, data) => {
    if (err) {
      console.log(err);
    }
    done(null, data);
  });
}

app.post("/api/users", (req, res) => {
  let user = req.body.username;
  CreateNewUser(user, (err, data) => {
    res.json({
      username: data["username"],
      _id: data["_id"],
    });
  });
});

app.get("/api/users", (req, res) => {
  User.find({})
    .select({ username: 1, _id: 1 })
    .exec((err, data) => {
      res.json(data);
    });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  let desc = req.body.description;
  let durr = parseInt(req.body.duration, 0);
  let dat = req.body.date;
  if (!dat) {
    dat = new Date();
  } else {
    dat = new Date(dat);
  }
  let id = req.params._id;
  User.findOneAndUpdate(
    { _id: id },
    {
      $inc: {
        count: 1,
      },
      $push: {
        log: {
          description: desc,
          duration: durr,
          date: dat,
        },
      },
    },
    { new: true },
    (err, data) => {
      if (err) {
        return console.log(err);
      }
      res.json({
        username: data["username"],
        description: desc,
        duration: durr,
        date: new Date(dat).toDateString(),
        _id: data["_id"],
      });
    }
  );
});

// we need to replace db format date with formatted string
function formatJSON_Dates(data) {
  return JSON.parse(JSON.stringify(data), (key, value) => {
    if (key == "date") {
      return new Date(value).toDateString();
    } else {
      return value;
    }
  });
}

app.get("/api/users/:_id/logs", (req, res) => {
  let id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let lim = parseInt(req.query.limit);

  console.log(req.ip + " logs call: id: " + req.originalUrl);


  let addidionalFilteringFlag = true;
  var dateFilter = {};
  if (from === undefined && to === undefined && lim ===undefined) {
    addidionalFilteringFlag = false;
  }
  




  if (!addidionalFilteringFlag) { //without processing stupid nested arrays it's so simple!
    User.findOne({ _id: id }, (err, data) => {
      if (err) {
        return console.log(err);
      }
      res.json(formatJSON_Dates(data));
    });
  } else {
    ////////////////////////////////
    // When query arguments used

    if (! lim) {
        lim = 999; // dirty hacks
    }
    if (from === undefined){
      from = '1970-01-01';
    }
    if (to === undefined){
      to = '2040-01-01';
    }
    
    // It was harsh! It was insane! No nested arrays ever again!!!
    User.aggregate([{ $match: { _id: id } }])
      .addFields({
        log: {
          $filter: {
            input: "$log",
            as: "l",
            limit: lim,
            cond: {
              $and: [
                { $gt: ["$$l.date", new Date(from)] },
                { $lt: ["$$l.date", new Date(to)] },
              ],
            },
          },
        },
      })
      .exec((err, data) => {
        if (data === undefined) {
          console.log("Error: nothing found!");
          return res.json({ error: "nothing found" });
        }
        res.json(formatJSON_Dates(data[0]));
      });
  }
});

/////////////// TESTING PURPOSE /////////////////////////
////////////////////////////////////////////////////////
const houseSchema = new mongoose.Schema({
  _id: String,
  housename: { type: String, unique: true },
  adress: String,
  people: [
    {
      name: String,
      age: Number,
    },
  ],
});

const House = mongoose.model("House", houseSchema);

function CreateNewHouse(done) {
  let house = new House({
    _id: 20,
    housename: "white",
    adress: "St1",
    people: [
      { name: "Jon", age: 23 },
      { name: "Ann", age: 50 },
      { name: "Pat", age: 20 },
      { name: "Helen", age: 15 },
    ],
  });

  house.save((err, data) => {
    if (err) return console.log(err);
    console.log(data);
    done(null, data);
  });
}

//House.remove({},(err,data)=>{console.log('database cleaned')});
//CreateNewHouse((err,data)=>{});

app.get("/api/test", (req, res) => {
  var searchID = "20";
  var minAge = 21;
  House.aggregate([{ $match: { _id: searchID } }])

    .unwind("people")
    .match({ "people.age": { $gt: minAge } })
    .group({
      _id: "$_id",
      people: { $push: "$people" },
    })
    .exec((err, data) => {
      res.json(data);
    });
});

app.get("/api/test2", async (req, res) => {
  //< Mark as async
  var searchID = "20";
  var minAge = 21;
  try {
    const data = await House.aggregate([
      {
        $match: {
          _id: searchID,
        },
      },
    ]).addFields({
      people: {
        $filter: {
          input: "$people",
          as: "p",
          cond: {
            $gt: ["$$p.age", minAge],
          },
        },
      },
    });
    res.json(data);
  } catch (err) {
    console.log(err);
    res.json({ message: "Error on server" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
