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

import document from "document";
import * as messaging from "messaging";

const backgroundRect = document.getElementById("background") as RectElement;
const arrowImg = document.getElementById("arrow") as ImageElement;
const glucoseText = document.getElementById("glucose") as TextElement;
const unitsText = document.getElementById("units") as TextElement;
const timestampText = document.getElementById("timestamp") as TextAreaElement;
const errorText = document.getElementById("error") as TextAreaElement;

function fetchGlucose() {
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        messaging.peerSocket.send({
            command: "glucose"
        });
    }
}

messaging.peerSocket.addEventListener("message", (evt) => {
    if (evt.data && "error" in evt.data) {
        backgroundRect.style.fill = "black";
        errorText.text = evt.data.error;
        glucoseText.text = "";
        timestampText.text = "";
        unitsText.text = "";
        arrowImg.href = "";
    } else if (evt.data && "Value" in evt.data) {
        errorText.text = "";
        glucoseText.text = evt.data.Value;
        timestampText.text = `Last Reading:\n${evt.data.Timestamp}`;
        switch(evt.data.GlucoseUnits) {
            case 1:
                unitsText.text = "mg/dL";
                break;
            default:
                unitsText.text = "mmol";
                break;
        }
        switch(evt.data.MeasurementColor) {
            case 1:
                backgroundRect.style.fill = "green";
                break;
            case 2:
                backgroundRect.style.fill = "yellow";
                break;
            case 3:
                backgroundRect.style.fill = "orange";
                break;
            case 4:
                backgroundRect.style.fill = "red";
                break;
            default:
                backgroundRect.style.fill = "grey";
                break;
        }
        switch(evt.data.TrendArrow) {
            case 1:
                arrowImg.href = "arrow-down-thick.png";
                break;
            case 2:
                arrowImg.href = "arrow-bottom-right-thick.png";
                break;
            case 3:
                arrowImg.href = "arrow-right-thick.png";
                break;
            case 4:
                arrowImg.href = "arrow-top-right-thick.png";
                break;
            case 5:
                arrowImg.href = "arrow-up-thick.png";
                break;
            default:
                arrowImg.href = "";
                break;
        }
    }
});

messaging.peerSocket.addEventListener("error", (err) => {
    console.error(`Connection error: ${err.code} - ${err.message}`);
});

setInterval(fetchGlucose, 60000);