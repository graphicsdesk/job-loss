const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

// Connection URL
const MDB_USERNAME = process.env.MDB_USERNAME;
const MDB_PASSWORD = process.env.MDB_PASSWORD;
const MDB_URI = `mongodb+srv://${MDB_USERNAME}:${MDB_PASSWORD}@lionshare-7nhlo.mongodb.net/test?retryWrites=true&w=majority`;

// Create a new MongoClient
const client = new MongoClient(MDB_URI, { useUnifiedTopology: true });

// Connect to the server
client.connect(function (err) {
  // Make sure there's no error
  if (err !== null) console.error(err);

  // Get the desired collection
  const db = client.db('aggregate');
  const collection = db.collection('postings');

  // Get an iterator for all the documents
  const cursor = collection.find({});

  // Invoke our main function on this cursor
  aggregatePostings(cursor);
});

function aggregatePostings(cursor) {
  // Date should be between September and today
  const lowerBound = '2019-09-16';
  const upperBound = new Date().toISOString().split('T')[0];

  const postingsByDate = {};

  // Loop through the postings
  cursor.forEach(
    // This callback is invoked for every element
    function ({ apply_start: date, remote }) {
      if (date === null || date < lowerBound || date > upperBound) return;

      const day = date.split('T')[0];
      if (!(day in postingsByDate)) {
        postingsByDate[day] = { count: 0, remoteCount: 0 };
      }
      postingsByDate[day].count += 1;
      remote && (postingsByDate[day].remoteCount += 1)
    },

    // This callback is invoked when the iterator ends
    function (err) {
      if (err !== null) console.error(err);
      client.close();

      // Make postingsByDate an array
      const output = [];
      for (const date in postingsByDate) {
        output.push({ date, ...postingsByDate[date] });
      }

      // Write the output to data/postings.json
      const filename = path.join(__dirname, '../data/postings.json');
      fs.writeFile(filename, JSON.stringify(output, null, 2), err => {
        if (err) throw err;
        console.log('Successfully wrote', filename);
      });
    },
  );
}
