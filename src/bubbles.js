import {json, select} from 'd3';
import {ReportTransformer} from './report-transformer';
import {phpUnitBubbles} from './php-unit-bubbles';

function getClassStyles(className, filter = false, allowed = []) {
    /*
        The intention was to use this to crate the styles for the exported SVG, but it was/is too verbose…
        It's still here because I might come back to it…
     */
    const dummyElement = document.createElement('div');
    dummyElement.className = className;
    document.body.appendChild(dummyElement);

    const filterFn = (property) => property.startsWith('--') || property.includes('color');

    const styles = getComputedStyle(dummyElement);
    const cssText = Array.from(styles).reduce((css, property) => {

        if (filter && !allowed.includes(property)) {
            return css;
        }
        if (filter && filterFn(property)) {
            return css;
        }

        return `${css}${property}:${styles.getPropertyValue(property)};`;
    }, '');

    document.body.removeChild(dummyElement);
    return cssText;
}

function cloneSVG(svgSelector = 'svg.bubbles') {

    // Select the root element
    const root = document.documentElement;

    // Get the computed style of the root element
    const rootStyles = getComputedStyle(root);

    // Get the value of the CSS variable --color-error
    const colorSuccess = rootStyles.getPropertyValue('--color-success').trim();
    const colorFailed = rootStyles.getPropertyValue('--color-failed').trim();
    const colorError = rootStyles.getPropertyValue('--color-error').trim();

    const svgElement = document.querySelector(svgSelector);
    const svgClone = svgElement.cloneNode(true);

    // Add CSS to the SVG
    let style = document.createElement('style');
    // --color-error
    style.textContent = `.bubbles circle{
            stroke: #aaa;
            stroke-width: 1px;
        }
        .bubbles circle.success {
            fill: ` + colorSuccess + `;
        }
        .bubbles circle.failed {
            fill: ` + colorFailed + `;
        }
        .bubbles circle.error {
            fill: ` + colorError + `;
        }
    `;
    svgClone.insertBefore(style, svgClone.firstChild);

    // Convert SVG to a Blob
    return new XMLSerializer().serializeToString(svgClone);
}

function cloneJsonDownload(jsonReport, downloadLinkId) {

    const blob = new Blob([JSON.stringify(jsonReport)]);

    const downloadLink = document.getElementById(downloadLinkId);

    downloadLink.href = window.URL.createObjectURL(blob);
    downloadLink.download = 'phpunit-bubble-report.json';
}

function cloneSVGToDownload(svgSelector = 'svg.bubbles', downloadLinkId) {

    const downloadLink = document.getElementById(downloadLinkId);

    const svgData = cloneSVG(svgSelector);

    const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});

    // Create an ObjectURL from the Blob
    const url = URL.createObjectURL(blob);

    // Set the ObjectURL as the href attribute of the download link
    downloadLink.href = url;
    downloadLink.download = 'phpunit-bubble-report.svg';

}

function cloneSVGToPNGDownload(svgSelector = 'svg.bubbles', downloadLinkId) {
    // Convert SVG to a Blob
    const svgData = cloneSVG(svgSelector);

    const canvas = document.createElement('canvas');

    const ctx = canvas.getContext('2d');

    const img = new Image();
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);

    // When the image loads (the svg), convert its contents to a blob and save that data url to the downloadLink
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(url);

        canvas.toBlob(function (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const downloadLink = document.getElementById(downloadLinkId);
            downloadLink.href = pngUrl;
            downloadLink.download = 'phpunit-bubble-report.png';
            //downloadLink.click(); // Trigger the download programmatically
        }, 'image/png');
    };

    img.src = url;
}

function generateBubbleGraph(chart, jsonReport) {

    select('#bubbles')
        .datum(jsonReport)
        .call(chart);

    cloneSVGToPNGDownload('svg.bubbles', 'png_download_link');
    cloneSVGToDownload('svg.bubbles', 'svg_download_link');
    cloneJsonDownload(jsonReport, 'json_report_download_link');
}

export async function bubbles() {

    // Compatibility tweaks
    window.URL = window.URL || window.webkitURL;
    const chart = phpUnitBubbles({width: 600, height: 450}).padding(2);

    // Global variables
    const jsonReport = await fetch('reports.xml')
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

    // Add global tooltip div
    select('body')
        .append('div')
        .attr('class', 'tooltip w-sm max-w-lg prose')
        .attr('id', 'tooltip')
        .style('position', 'absolute')
        .style('opacity', 0);

    generateBubbleGraph(chart, jsonReport);

    if (import.meta.env.VITE_OUT_DIR !== 'dist') {
        // Update chart with user submitted data
        document.getElementById('report_form').addEventListener('submit', function (e) {

            const chart = phpUnitBubbles({width: 600, height: 450}).padding(2);
            e.preventDefault();

            document.getElementById('sample_introduction').innerText = 'Here is your custom report:';

            let report = document.getElementById('report').value;

            if (report.length > 0) {
                select('#bubbles').datum(ReportTransformer.transform(report)).call(chart);
            }
        });
        // Update the user submitted data from an uploaded xml file
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

    // Authorize PNG report download (for external embedding)
    document.getElementById('bubble_refresh').addEventListener('click', function (e) {
        e.preventDefault();
        generateBubbleGraph(chart, jsonReport);
    });

    // Authorize PNG report download (for external embedding)
    document.getElementById('png_download_link').addEventListener('click', function (e) {
        if (!confirm('Download the bubble graph as a bitmap (png) image?')) {
            e.preventDefault();
        }
    });

    // Authorize SVG report download (for external embedding)
    document.getElementById('svg_download_link').addEventListener('click', function (e) {
        if (!confirm('Download the bubble graph as a vector (svg) image?')) {
            e.preventDefault();
        }
    });

    // Authorize JSON report download (for external embedding)
    document.getElementById('json_report_download_link').addEventListener('click', function (e) {
        if (!confirm('Download the json object for the bubble graph?')) {
            e.preventDefault();
        }
    });
}