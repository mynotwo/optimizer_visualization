// Populate a grid of n×m values where -2 ≤ x ≤ 2 and -2 ≤ y ≤ 1.
let svg = d3.select("#vis");

let rect = svg.node()
        .getBoundingClientRect(),
    width = rect.width,
    height = rect.height;
let bar_height = d3.select('#visualization-bar').node().getBoundingClientRect().height;
let selectedOpt = [];
let selectedObj = "flower";
let selectedEpoch = [];
let selectedLearningRate = [];
let selectedDecayRate = [];

let bounds = [-6, 6, -6, 6];

let scalePosX = d3.scaleLinear()
    .domain([0, 1])
    .range([bounds[0], bounds[1]]);

let scalePosY = d3.scaleLinear()
    .domain([0, 1])
    .range([bounds[2], bounds[3]]);

let pos = [scalePosX(Math.random()), scalePosY(Math.random())];

let cusX = [-6, 6];
let cusY = [-6, 6];

Array.prototype.remove = function () {
    let what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

let view2posX = d3.scaleLinear()
    .domain([0, width])
    .range([bounds[0], bounds[1]]);

let view2posY = d3.scaleLinear()
    .domain([0, height])
    .range([bounds[2], bounds[3]]);

function drawCircle(x, y, size) {
    // console.log('Drawing circle at', x, y, size);
    svg.selectAll("circle")
        .remove();

    svg.append("circle")
        .attr('class', 'click-circle')
        .attr('fill', 'yellow')
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", size);
}


$(document).ready(function () {

    svg.on('click', d => {

        console.log('------------');
        [x, y] = [d3.event.x, d3.event.y];
        pos[0] = view2posX(x).toFixed(2);
        pos[1] = view2posY(y - bar_height).toFixed(2);
        drawCircle(x, y - bar_height, 5.5);
        // drawCircle(0, 0, 5.5);
        $('#StartPoint').html('(' + pos[0] + ', ' + pos[1] + ')');
    });

    let obj = {
        "opt": [],
        "width": width,
        "height": height,
        "obj": "flower",
        "epoch": 1000,
        "rate": 1000,
        "reg": 0.01,
        "customize": false,
        "pos": pos,
        "X": [-6, 6],
        "Y": [-6, 6]
    };

    d3.request('/training')
        .mimeType("text/csv")
        .post(JSON.stringify(obj), function (error, y, z) {
            let data = JSON.parse(y.response).res;
            let values = data.values;
            delete data.values;
            updateVis(values, data);
        });

    $('#play-pause-button')
        .click(function (hello) {
            var obj = {
                "opt": selectedOpt,
                "width": width,
                "height": height,
                "obj": selectedObj,
                "epoch": selectedEpoch,
                "rate": selectedLearningRate,
                "reg": selectedDecayRate,
                "customize": false,
                "pos": pos,
                "X": [-6, 6],
                "Y": [-6, 6]
            };

            if ($('#myModal').is(":visible")) {
                obj.X = [$('#x1').val(), $('#x2').val()];
                obj.Y = [$('#y1').val(), $('#y2').val()];
                cusX = [$('#x1').val(), $('#x2').val()];
                cusY = [$('#y1').val(), $('#y2').val()];
                obj.customize = true;
                obj.obj = $('#objective-function-python').val();
            } else {
                cusX = [-6, 6];
                cusY = [-6, 6];
            }

            d3.request('/training')
                .mimeType("text/csv")
                .post(JSON.stringify(obj), function (error, y, z) {
                    let data = JSON.parse(y.response).res;
                    let values = data.values;
                    delete data.values;
                    updateVis(values, data);
                });
        });

    $('#myModal').hide();

    $('#optimizer').multiselect({

        onChange: function (option, checked, select) {

            let opt = $(option).val();
            if (selectedOpt.includes(opt)) {
                selectedOpt.remove(opt);
            } else {
                selectedOpt.push(opt);
            }
        }
    });


    $('#epoch').multiselect({

            onChange: function (option, checked, select) {

                let epoch = $(option).val();
                if (selectedEpoch.includes(epoch)) {
                    selectedEpoch.remove(epoch);
                } else {
                    selectedEpoch.push(epoch);
                }
            }
        }
    );

    $('#objective').multiselect({

        onChange: function (option, checked, select) {

            $(".ui-objective .multiselect-selected-text").html($(option).html());


            let obj = $(option).val();

            if (obj === "customize") {
                $('#myModal').show();
            } else {
                selectedObj = obj;
                $('#myModal').hide();
            }
        }
    });

    $('#learningRate').multiselect({
        onChange: function (option, checked, select) {

            let rate = $(option).val();
            if (selectedLearningRate.includes(rate)) {
                selectedLearningRate.remove(rate);
            } else {
                selectedLearningRate.push(rate);
            }

        }
    });

    $('#regularizations').multiselect({

        onChange: function (option, checked, select) {
            // console.log($(option).val());
        }
    });
    $('#dacayRate').multiselect({

            onChange: function (option, checked, select) {
                let opt = $(option).val();
                if (selectedDecayRate.includes(opt)) {
                    selectedDecayRate.remove(opt);
                } else {
                    selectedDecayRate.push(opt);
                }

            }
        }
    );
});


function updateVis(values, paths) {
    Object.keys(paths).forEach(function (key, i) {
        console.log(key + ":" + paths[key].length);
    });

    svg.selectAll("*").remove();
    let thresholds = [0.0025, 0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.075, 0.10, 0.15, 0.2, 0.5, 0.8, 2.0, 5.00, 10, 25.00, 50, 100, 150.0, 200.0, 250.0, 300.0, 400.0, 500];
    // draw contours
    let contours = d3.contours()
        .size([width, height])
        .thresholds(thresholds);
    let color = d3.scaleLog()
        .domain(d3.extent(thresholds))
        .interpolate(function () {
            return d3.interpolateRainbow;
        });
    svg.selectAll("path")
        .data(contours(values))
        .enter()
        .append("path")
        .attr("d", d3.geoPath())
        .attr("fill", function (d) {
            return color(d.value);
        });

    // draw lines
    console.log('draw lines');
    var x = d3.scaleLinear()
        .rangeRound([0, width]).domain(cusX);
    var y = d3.scaleLinear()
        .rangeRound([0, height]).domain(cusY);
    let line = d3.line()
        // .interpolate("cardinal")
        .x(function (d) {
            return x(d[0]);
        })
        .y(function (d) {
            return y(d[1]);
        });

    // let c10 = d3.scaleCategory10;
    let c10 = d3.scaleOrdinal(d3.schemeCategory10);
    let keys = [];
    let colors = [];

    Object.keys(paths).forEach(function (key, i) {

        let transition = function (path) {
            path.transition()
                .duration(paths[key].length)
                .attrTween("stroke-dasharray", tweenDash);
        };
        let tweenDash = function () {
            let l = this.getTotalLength(),
                i = d3.interpolateString("0," + l, l + "," + l);
            return function (t) {
                return i(t);
            };
        };
        let path = svg.append("path")
            .attr("d", line(paths[key]))
            .attr("stroke", c10(i))
            .attr("stroke-width", "3")
            .attr("fill", "none")
            .attr("data-legend", key)
            .call(transition);
        keys.push(key);
        colors.push(c10(i));
    });
    let legend_svg = d3.select('#vis-legend');
    var symbolScale = d3.scaleOrdinal()
        .domain(keys)
        .range(colors);

    legend_svg.append("g")
        .attr("class", "legendSymbol")
        .attr("font-size", "15px")
        .attr("transform", "translate(20, 20)");

    var legendPath = d3.legendColor()
        .scale(symbolScale);

    legend_svg.select(".legendSymbol")
        .call(legendPath);
}

function flower(x, y) {
    let scaleX = d3.scaleLinear()
        .domain([0.0, 1.0])
        .range([-6.0, 6.0]);

    let scaleY = d3.scaleLinear()
        .domain([0.0, 1.0])
        .range([-6.0, 6.0]);

    x = scaleX(x);
    y = scaleY(y);
    return (x * x) + (y * y) + x * Math.sin(y) + y * Math.sin(x);
}
