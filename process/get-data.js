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

// Date should be between September and today
const lowerBound = '2019-09-06';
const upperBound = new Date().toISOString().split('T')[0];

const postingsByDate = {};
function incrementPostings(date, remote) {
  if (!(date in postingsByDate)) {
    postingsByDate[date] = { count: 0, remoteCount: 0 };
  }
  postingsByDate[date].count += 1;
  remote && (postingsByDate[date].remoteCount += 1);
}

const industryChanges = {};
const dateSplit = '2020-03-01';
function incrementIndustries(day, industry) {
  if (industry === null) {
    return;
  }
  if (!(industry in industryChanges)) {
    industryChanges[industry] = { before: 0, after: 0 };
  }
  industryChanges[industry][day < dateSplit ? 'before' : 'after'] += 1;
}

function aggregatePostings(cursor) {
  // Loop through the postings
  cursor.forEach(
    // This callback is executed for each element
    function ({ apply_start, remote, employer_industry_name }) {
      const date = apply_start === null ? null : apply_start.split('T')[0];
      if (date === null || date < lowerBound || date > upperBound) {
        return;
      }
      incrementPostings(date, remote);
      incrementIndustries(date, employer_industry_name);
    },

    // This callback is executed when the iterator ends
    function (err) {
      if (err !== null) console.error(err);
      client.close();

      // Make postingsByDate an array
      const postingsDatesArray = [];
      for (const date in postingsByDate) {
        postingsDatesArray.push({ date, ...postingsByDate[date] });
      }

      const output = {
        postings: postingsDatesArray,
        industryChanges: Object.keys(industryChanges).reduce((acc, industry) => {
          const { before, after } = industryChanges[industry];
          if (before + after < 50) {
            return acc;
          }
          const beforeNorm = before / daysBetween(lowerBound, dateSplit);
          const afterNorm = after / daysBetween(dateSplit, upperBound);
          const percentChange = (afterNorm - beforeNorm) / beforeNorm;
          acc[industry] = percentChange;
          return acc;
        }, {}),
      };

      // Write the output to data/postings.json
      const filename = path.join(__dirname, '../data/postings.json');
      fs.writeFile(filename, JSON.stringify(output, null, 2), err => {
        if (err) throw err;
        console.log('Successfully wrote', filename);
      });
    },
  );
}

/**
 * Calculates number of days between two date strings.
 * Source: https://bit.ly/2SWbTJz
 */
function daysBetween(first, second) {
  // Take the difference between the dates and divide by milliseconds per day.
  // Round to nearest whole number to deal with DST.
  return Math.round((Date.parse(second) - Date.parse(first))/(1000*60*60*24));
}