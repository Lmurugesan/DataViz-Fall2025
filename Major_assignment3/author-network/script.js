d3.json("data.json").then(data => {
    const width = 900;
    const height = 600;
    const svg = d3.select("svg");
    const tooltip = d3.select("#tooltip");

    // Top 10 countries for color scale
    const countryCount = d3.rollup(data.nodes, v => v.length, d => d.affiliation);
    const topCountries = Array.from(countryCount.entries())
                              .sort((a,b) => b[1]-a[1])
                              .slice(0,10)
                              .map(d => d[0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
                    .domain(topCountries);

    const nodeScale = d3.scaleSqrt()
                        .domain(d3.extent(data.nodes, d => d.degree))
                        .range([3, 12]);

    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(50).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width/2, height/2))
        .force("collision", d3.forceCollide().radius(d => nodeScale(d.degree)+2));

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6);

    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .join("circle")
        .attr("r", d => nodeScale(d.degree))
        .attr("fill", d => topCountries.includes(d.affiliation) ? color(d.affiliation) : "#A9A9A9")
        .call(drag(simulation));

    node.on("click", function(event, d) {
    // Stop click from propagating to the SVG background
    event.stopPropagation();

    tooltip.style("opacity", 1)
           .html(`<strong>${d.id}</strong><br>Affiliation: ${d.affiliation}<br>Degree: ${d.degree}`)
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 20) + "px");
});

// Hide tooltip only when clicking on empty space (not on nodes)
svg.on("click", function() {
    tooltip.style("opacity", 0);
});


    simulation.on("tick",()=>{
        link.attr("x1", d=>d.source.x)
            .attr("y1", d=>d.source.y)
            .attr("x2", d=>d.target.x)
            .attr("y2", d=>d.target.y);

        node.attr("cx", d=>d.x)
            .attr("cy", d=>d.y);
    });

    function drag(sim){
        function dragstarted(event,d){
            if(!event.active) sim.alphaTarget(0.3).restart();
            d.fx=d.x; d.fy=d.y;
        }
        function dragged(event,d){ d.fx=event.x; d.fy=event.y; }
        function dragended(event,d){
            if(!event.active) sim.alphaTarget(0);
            d.fx=null; d.fy=null;
        }
        return d3.drag()
                 .on("start", dragstarted)
                 .on("drag", dragged)
                 .on("end", dragended);
    }

    // UI sliders
    d3.select("#chargeSlider").on("input", function(){
        simulation.force("charge").strength(+this.value);
        simulation.alpha(1).restart();
    });
    d3.select("#collisionSlider").on("input", function(){
        simulation.force("collision").radius(d=>nodeScale(d.degree)+(+this.value));
        simulation.alpha(1).restart();
    });
    d3.select("#linkSlider").on("input", function(){
        simulation.force("link").strength(+this.value);
        simulation.alpha(1).restart();
    });
});
