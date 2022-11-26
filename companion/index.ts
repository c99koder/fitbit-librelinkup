// Copyright 2022 Sam Steele
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { me as companion } from 'companion';

const LIBRELINKUP_URL = 'https://api-us.libreview.io'
const LIBRELINKUP_VERSION = '4.2.2'
const LIBRELINKUP_PRODUCT = 'llu.ios'
const LIBRELINKUP_HEADERS = {"Content-Type": "application/json", version: LIBRELINKUP_VERSION, product: LIBRELINKUP_PRODUCT}

var LIBRELINKUP_TOKEN = settingsStorage.getItem("token");

if (companion.permissions.granted("run_background")) {
    companion.wakeInterval = 15 * 1000 * 60;

    companion.addEventListener("wakeinterval", (evt) => {
        fetchGlucose();
    });
}

if (settingsStorage.getItem("loginStatus") == null)
    settingsStorage.setItem("loginStatus", "Enter your credentials and tap the login button to continue.");

settingsStorage.addEventListener("change", (evt) => {
    if(evt.key === "login") {
        settingsStorage.setItem("loginStatus", "Logging in…");
        delete LIBRELINKUP_HEADERS['Authorization'];
        const body = JSON.stringify(
            {email: JSON.parse(settingsStorage.getItem("email")).name, password: JSON.parse(settingsStorage.getItem("password")).name}
            );
        fetch(LIBRELINKUP_URL + "/llu/auth/login", {method: "POST", body: body, headers: LIBRELINKUP_HEADERS})
        .then(function(response) {
            return response.json();
        }).then(function(json) {
            if ("error" in json) {
                settingsStorage.setItem("loginStatus", `Authentication failed: ${json.error.message}`);
            } else if ("data" in json && "authTicket" in json.data) {
                settingsStorage.setItem("token", json.data.authTicket.token);
                settingsStorage.setItem("loginStatus", "Fetching connection info");
                fetchGlucose();
            }
        });
    }
});

messaging.peerSocket.addEventListener("open", (evt) => {
    if(settingsStorage.getItem("glucose") != null) {
        messaging.peerSocket.send(JSON.parse(settingsStorage.getItem("glucose")));
    }
    fetchGlucose();
});

messaging.peerSocket.addEventListener("error", (err) => {
    console.error(`Connection error: ${err.code} - ${err.message}`);
});

messaging.peerSocket.addEventListener("message", (evt) => {
    if (evt.data && evt.data.command === "glucose") {
        fetchGlucose();
    }
});

function fetchGlucose() {
    LIBRELINKUP_TOKEN = settingsStorage.getItem("token");

    if (LIBRELINKUP_TOKEN != null) {
        LIBRELINKUP_HEADERS['Authorization'] = "Bearer " + LIBRELINKUP_TOKEN;

        fetch(LIBRELINKUP_URL + "/llu/connections", {headers: LIBRELINKUP_HEADERS})
        .then(function(response) {
            return response.json();
        }).then(function(json) {
            if ("data" in json && json.data.length > 0) {
                settingsStorage.setItem("loginStatus", `Logged in as ${json.data[0].firstName} ${json.data[0].lastName}. Sensor SN: ${json.data[0].sensor.sn}`);
                settingsStorage.setItem("glucose", JSON.stringify(json.data[0].glucoseMeasurement));
                if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
                    messaging.peerSocket.send(json.data[0].glucoseMeasurement);
                }
            } else {
                if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
                    messaging.peerSocket.send({error: "Failed to fetch glucose data"});
                }
            }
        });
    } else {
        if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
            messaging.peerSocket.send({error: "Open the Fitbit Settings\non your phone to login"});
        }
    }
}
