const axios = require('axios');

const launchesDB = require('./launches.mongo');
const planets = require('./planets.mongo');

const launches = new Map();

const DEFAULT_FLIGHT_NUMBER = 100;

const launch = {
    flightNumber: 100, // flight_number
    mission: 'Kepler Exproration X', // name
    rocket: 'Explorer IS1', // rocket.name
    launchDate: new Date('December 27, 2030'), // date_local
    target: 'Kepler-442 b', // not applicable
    customers: ['ZTM', 'NASA'],
    upcoming: true, // upcoming
    success: true, // success
};

saveLaunch(launch);
// launches.set(launch.flightNumber, launch);

const SPACEX_API_URL = 'https://api.spacexdata.com/v5/launches/query';

async function populateLaunches() {
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        'customers': 1
                    }
                }
            ]
        }
    });

    if(response.status !== 200) {
        console.log('Problem downloading launch data');
        throw new Error('Launch data download failed');
    }

    const launchDocs = response.data.docs;
    for(const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers: customers
        };

        console.log(`${launch.flightNumber} ${launch.mission}`);

        await saveLaunch(launch)
    }
}

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat'
    })
    if(firstLaunch) {
        console.log('Launch data already loaded');
        return;
    } else {
        await populateLaunches();
    }
}

async function findLaunch(filter) {
    return await launchesDB.findOne(filter)
}

async function existLaunchWithId(launchId) {
    return await findLaunch({
        flightNumber: launchId
    });
    // return launches.has(launchId);
}

async function getLatestFlightNumber() {
    const latestLaunch = await launchesDB.findOne().sort('-flightNumber');
    if(!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }
    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    return await launchesDB
        .find({}, {'_id': 0, '__v': 0})
        .sort({ flightNumber: 1 })
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch) {
    await launchesDB.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true,
    })
}

// function addNewLaunch(launch) {
//     latestFlightNumber++;
//     launches.set(
//         latestFlightNumber, 
//         Object.assign(launch, {
//             success: true,
//             upcoming: true,
//             customer: ['Zero to Mastery', 'NASA'], 
//             flightNumber: latestFlightNumber,
//         })
//     );
// }

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        keplerName: launch.target
    })

    if(!planet) {
        throw new Error('No matching planet found');
    }

    const newFlightNumber = await getLatestFlightNumber() + 1;
    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['Zero to Mastery', 'NASA'], 
        flightNumber: newFlightNumber
    });

    await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
    const aborted = await launchesDB.updateOne({
        flightNumber: launchId
    }, {
        upcoming: false,
        success: false
    })

    return aborted.modifiedCount === 1;
}

module.exports = {
    loadLaunchData,
    existLaunchWithId,
    getAllLaunches,
    scheduleNewLaunch,
    abortLaunchById
}