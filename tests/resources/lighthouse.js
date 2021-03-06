/*
   Copyright 2018 getcarrier.io

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const lighthouse = require('lighthouse');
const { write } = require('lighthouse/lighthouse-cli/printer');
const jp = require('jsonpath');
const request = require('request');
const fs = require('fs-extra');
const { format } = require('util')

function Lighthouse() {
    this.viewedPages = {}
}

function getScores(data) {
    var perf = jp.query(data, "$..[?(@.id=='performance')].score")
    var bp = jp.query(data, "$..[?(@.id=='best-practices')].score")
    var acc = jp.query(data, "$..[?(@.id=='accessibility')].score")
    var pwa = jp.query(data, "$..[?(@.id=='pwa')].score")

    return {
        "performance": Math.round(perf),
        "accessibility": Math.round(acc),
        "best_practices": Math.round(bp),
        "pwa": Math.round(pwa)
    }
}

function configureFormData(scores, page) {
    // file_path is the path to saved LH page 
    var file_path = `${page}.html`
    return {
        'file': fs.createReadStream(file_path),
        'p': scores.performance,
        'a': scores.accessibility,
        'b': scores.best_practices,
        'pwa': scores.pwa
    }
}

function uploadLighthousePage(formData, simulation) {
    var url = format("http://localhost...", simulation)
    request.post({ url: url, formData: formData },
        function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('Upload failed:', err);
            }
            console.log('Server responded with:', body);
        });
}

Lighthouse.prototype.runLighthouse = function (url, lighthouse_opts, config = null) {
    return lighthouse(url, lighthouse_opts, config).then(results => {
        delete results.artifacts;
        return results
    });
}


Lighthouse.prototype.saveLighthouse = function (data, pageName, simulation) {
    try {
        write(data, 'html', `/tmp/reports/lighthouse_pages/${pageName}.html`).then(() => {
            var scores = getScores(data)
            // var formData = configureFormData(scores, pageName)
            // uploadLighthousePage(formData, simulation)
        })
        console.info('Lighthouse Page data saved to: %s.html\n', pageName);
    } catch (e) {
        console.error("Lighthouse page didn't saved.")
        console.error(e)
    }
}

Lighthouse.prototype.startLighthouse = function (pageName, lighthouse_opts, driver, simulation) {
    var outer_this = this;
        driver.getCurrentUrl()
            .then(url => outer_this.runLighthouse(url, lighthouse_opts)
                .then(results => outer_this.saveLighthouse(results, pageName, simulation)))
}

module.exports = Lighthouse;