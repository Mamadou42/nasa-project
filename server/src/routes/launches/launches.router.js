const express = require('express');
const { httpGetAllLaunches, httpAddNewLaunch, httpAbortLaunch } = require('./launches.controller');

const launchessRouter = express.Router();

launchessRouter.get('/', httpGetAllLaunches);
launchessRouter.post('/', httpAddNewLaunch);
launchessRouter.delete('/:id', httpAbortLaunch);

module.exports = launchessRouter;