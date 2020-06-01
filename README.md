# Job Loss hi

This story was created with [Spectate](https://github.com/graphicsdesk/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/graphicsdesk/spectate/#cloning-a-spectate-project).

## Data Diary

#### `data/postings.json`

Untracked. To get postings data from MongoDB, setup a `.env` file with the following [credentials](https://docs.google.com/document/d/1C6WPRpabD6YXjQK3VnvjGy02fgxaARHbJTirm3Rzf8I/edit#heading=h.tamwx7fxlakd):

```
MDB_USERNAME = <username>
MDB_PASSWORD = <password>
```

Now you can run:

```
$ node process/get-data.js
```

#### `data/canceled-internships.json`

Tracked. Be careful when regenerating the [`canceled-internships`](https://github.com/graphicsdesk/canceled-internships) data, as it also regenerates the random index mapping that controls the color scale.
