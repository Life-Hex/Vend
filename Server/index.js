'use strict'
let { Kerds, Database, SessionsManager } = require('kerds');
global.fs = require('fs');

let metadata = {
    styles: [
        './fontawesome/css/all.css'
    ],
    scripts: {
        './includes/index.js': { type: 'module' },
    }
};

global.kerds = new Kerds({ server: { address: "mongodb://localhost:27017/", name: 'vend' } });
kerds.appPages = [
    'index.html',
    'dashboard.html',
    'apps.html',
    'users.html'
];

global.db = Database({ local: true, port: '27017', name: 'vend' });
global.bcrypt = require('bcrypt');
global.ObjectId = require('mongodb').ObjectId;

let { PostHandler } = require('./includes/classes/PostHandler');
let { View } = require('./includes/classes/View');

let postHandler = new PostHandler();
let view = new View(metadata, 'webapp');
global.sessions = kerds.sessionsManager.sessions;

function setup() {
    return new Promise((resolve, rejects) => {
        resolve(true);
    });
}

function setDb(session) {
    if (!kerds.isset(global.sessions[session].db)) {
        global.sessions[session].db = new Database({ port: '27017', local: true, name: 'vend' });
    }
    if (kerds.isset(global.sessions[session].tenant)) {
        global.sessions[session].db.setName(global.sessions[session].tenant);
    }
}

let { port, protocol } = kerds.getCommands('-');
if (!kerds.isset(port)) port = 8082;
if (!kerds.isset(protocol)) protocol = 'https';

setup().then(done => {
    kerds.createServer({
        port,
        protocol,
        domains: {origins: ['*']},
        httpsOptions: {
            key: fs.readFileSync('./permissions/server.key'),
            cert: fs.readFileSync('./permissions/server.crt')
        },
        response: params => {
            setDb(params.sessionId);
            view.createView(params);
        }
    });
});

kerds.recordSession({ period: 24 * 60 * 60 * 1000, remember: ['tenant', 'user'], server: { port: '27017', local: true, name: 'vend' } });
kerds.handleRequests = (req, res, form) => {
    setDb(req.sessionId);
    postHandler.act(req, res, form);
}