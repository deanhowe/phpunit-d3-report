import {json, select} from 'd3';
import {ReportTransformer} from './report-transformer';
import {phpUnitBubbles} from './php-unit-bubbles';

export async function bubbles() {

    // Compatibility tweaks
    window.URL = window.URL || window.webkitURL;

    // Global variables
    let chart = phpUnitBubbles({width: 600, height: 450}).padding(2);
    let jsonReport = null;

    let data = await fetch('report.xml')
        .then(response => response.text()).then(XMString => {
            // check if the XMString is  actually XML
            //console.log(ReportTransformer.isXMLorHTML(XMString));
            if (ReportTransformer.isXMLorHTML(XMString) === 'XML') {
                //console.log(XMString);
                return ReportTransformer.transform(XMString);
            } else {
                // Quite sure this dependency could be removed and replaced with a fetch() call
                return json('reports/symfony2.json')
            }
        })
        .catch(error => {
            console.log('Error fetching XML file', error)
        })

    select('#bubbles')
        .datum(data)
        .call(chart);

    // Add tooltip details on hover
    select('body')
        .append('div')
        .attr('class', 'tooltip w-sm max-w-lg prose')
        .attr('id', 'tooltip')
        .style('position', 'absolute')
        .style('opacity', 0);

    if(import.meta.env.VITE_OUT_DIR !== 'dist'){

    // Update chart with user submitted data
    document.getElementById('report_form').addEventListener('submit', function (e) {

        e.preventDefault();

        document.getElementById('sample_introduction').innerText = 'Here is your custom report:';

        let report = document.getElementById('report').value;

        if (report.length > 0) {
            jsonReport = ReportTransformer.transform(report);
            select('#bubbles').datum(jsonReport).call(chart);
        }
    });

    document.getElementById('file_upload').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('report').value = e.target.result;
            };
            reader.readAsText(file);
        }
    });

    }

    // Authorize JSON report download (for external embedding)
    document.getElementById('json_report_download_link').addEventListener('click', function (e) {
        let blob = new Blob([JSON.stringify(jsonReport)]);
        this.href = window.URL.createObjectURL(blob);
        this.download = 'phpunit-d3-report.json';
    });
}