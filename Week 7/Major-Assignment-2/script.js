/*-------------------------------------------------------*/
/*------------------- Window setting --------------------*/
/*-------------------------------------------------------*/
const window_dims = {
    width: window.innerWidth,
    height: window.innerHeight
};

const svgWidth = window_dims.width / 2;
const svgHeight = window_dims.width / 3;

/*-------------------------------------------------------*/
/*----------------- Load data in parallel ---------------*/
/*-------------------------------------------------------*/
const MA_counties = "./data/towns.topojson";
const gini_index = "./data/gini_index.csv";

Promise.all([
    d3.json(MA_counties),
    d3.csv(gini_index)
]).then(([topology_data, giniData]) => {

    const tooltip = d3.select("#tooltip");

    /*-------------------------------------------------------*/
    /*---------------------- Projections -------------------*/
    /*-------------------------------------------------------*/
    const geojson = topojson.feature(topology_data, topology_data.objects.ma);
    const projection = d3.geoMercator().fitSize([svgWidth, svgHeight], geojson);
    const path = d3.geoPath().projection(projection);

    /*-------------------------------------------------------*/
    /*---------------------- MAP A -------------------------*/
    /*-------------------------------------------------------*/
    const colorScalePop = d3.scaleLinear()
        .domain(d3.extent(geojson.features, d => d.properties.POP1980))
        .range(["#fee5d9", "#de2d26"]);

    const svgA = d3.select(".fig1").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    svgA.selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => colorScalePop(d.properties.POP1980))
        .attr("stroke", "#333")
        .on("mouseenter", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.properties.TOWN}</strong><br/>Population 1980: ${d.properties.POP1980}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            svgB.selectAll("path")
                .filter(b => b.id === d.id)
                .attr("stroke-width", 3)
                .attr("stroke", "orange");
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(400).style("opacity", 0);
            svgB.selectAll("path")
                .filter(b => b.id === d.id)
                .attr("stroke-width", 1)
                .attr("stroke", "#333");
        });

    /*-------------------------------------------------------*/
    /*---------------------- MAP B -------------------------*/
    /*-------------------------------------------------------*/
    const svgB = d3.select(".fig2").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // Calculate population change
    const popChange = geojson.features.map(d => ({
        id: d.id,
        change: d.properties.POP2010 - d.properties.POP1980
    }));

    // Diverging color scale
    const changeExtent = d3.extent(popChange, d => d.change);
    const maxAbsChange = Math.max(Math.abs(changeExtent[0]), Math.abs(changeExtent[1]));

    const colorScaleChange = d3.scaleDiverging()
        .domain([-maxAbsChange, 0, maxAbsChange])
        .interpolator(d3.interpolateRdBu);

    svgB.selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const town = popChange.find(t => t.id === d.id);
            return town ? colorScaleChange(town.change) : "#ccc";
        })
        .attr("stroke", "#333")
        .on("mouseenter", (event, d) => {
            const town = popChange.find(t => t.id === d.id);
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
                <strong>${d.properties.TOWN}</strong><br/>
                Population change: ${town.change.toLocaleString()}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            svgA.selectAll("path")
                .filter(a => a.id === d.id)
                .attr("stroke-width", 3)
                .attr("stroke", "orange");
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(400).style("opacity", 0);
            svgA.selectAll("path")
                .filter(a => a.id === d.id)
                .attr("stroke-width", 1)
                .attr("stroke", "#333");
        });

    /*-------------------------------------------------------*/
    /*---------------------- MAP C -------------------------*/
    /*-------------------------------------------------------*/
    createMapC(geojson, giniData, tooltip, path);
});

/*-------------------------------------------------------*/
/*---------------------- MAP C -------------------------*/
/*-------------------------------------------------------*/
function createMapC(geojson, giniData, tooltip, path) {

    const svgC = d3.select(".fig3").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // Normalize IDs and convert Gini to numeric
    giniData.forEach(d => {
        d.id = d.id.slice(-5);
        d.year = +d.year;
        d.gini = +d["Estimate!!Gini Index"];
    });

    // Group by county
    const giniByCounty = d3.group(giniData, d => d.id);

    // Latest Gini (2019)
    const latestGini = new Map();
    giniByCounty.forEach((values, id) => {
        const latest = values.find(v => v.year === 2019) || values[values.length - 1];
        latestGini.set(id, latest.gini);
    });

    // Color scale
    const colorScaleGini = d3.scaleSequential()
        .domain(d3.extent(Array.from(latestGini.values())))
        .interpolator(d3.interpolatePlasma);

    // Draw counties
    svgC.selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => latestGini.has(d.id) ? colorScaleGini(latestGini.get(d.id)) : "#ccc")
        .attr("stroke", "#333")
        .on("mouseenter", (event, d) => {
            const id = d.id;
            const data = giniByCounty.get(id);
            if (!data) return;

            const latest = data.find(v => v.year === 2019) || data[data.length - 1];
            tooltip.transition().duration(200).style("opacity", 0.95);

            // Mini line chart inside tooltip
            const w = 140, h = 50, pad = 5;
            const x = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([pad, w - pad]);
            const y = d3.scaleLinear().domain(d3.extent(data, d => d.gini)).range([h - pad, pad]);
            const line = d3.line()
                .x(d => x(d.year))
                .y(d => y(d.gini));

            const miniSVG = `<svg width="${w}" height="${h}">
                <path d="${line(data)}" stroke="white" fill="none" stroke-width="1.5"/>
            </svg>`;

            tooltip.html(`
                <strong>${data[0]["Geographic Area Name"]}</strong><br/>
                Gini Index (2019): <b>${latest.gini.toFixed(3)}</b><br/>
                Population 1980: ${d.properties.POP1980?.toLocaleString() || "N/A"}<br/>
                Population 2010: ${d.properties.POP2010?.toLocaleString() || "N/A"}<br/>
                ${miniSVG}
            `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 60) + "px");

            d3.select(event.currentTarget)
                .attr("stroke-width", 3)
                .attr("stroke", "black");
        })
        // 👇 Add CLICK event to persist population info on click
        .on("click", (event, d) => {
            const id = d.id;
            const data = giniByCounty.get(id);
            if (!data) return;

            const latest = data.find(v => v.year === 2019) || data[data.length - 1];
            alert(`📍 ${data[0]["Geographic Area Name"]}
Population 1980: ${d.properties.POP1980?.toLocaleString() || "N/A"}
Population 2010: ${d.properties.POP2010?.toLocaleString() || "N/A"}
Gini Index (2019): ${latest.gini.toFixed(3)}`);
        })
        .on("mouseout", (event) => {
            tooltip.transition().duration(400).style("opacity", 0);
            d3.select(event.currentTarget)
                .attr("stroke-width", 1)
                .attr("stroke", "#333");
        });
}
