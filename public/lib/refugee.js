function map(year) {
  var data,
      xy = d3
            .geo
            .equirectangular()
            .scale($('#map_container').width())
            .translate([$('#map_container').width() / 2, $('#map_container').height() / 2]),
      path = d3
              .geo
              .path()
              .projection(xy),
      svg = d3
              .select('#map_container')
              .append('svg:svg')
              .attr("pointer-events", "all")
              .append("svg:g")
              .call(d3.behavior.zoom().on("zoom", redraw))
              .append("svg:g"),
      countries = svg
                    .append('svg:g')
                    .attr('id', 'countries'),
      nodes = svg
                    .append('svg:g')
                    .attr('id', 'circles'),
      maxWidth = 30,
      minWidth = 1



  /* World Map */

  var area = d3.svg.area()
    .x0(function(d) { return d.x0 })
    .x1(function(d) { return d.x1 })
    .y0(function(d) { return d.y0 })
    .y1(function(d) { return d.y1 })

  var helper = {
    getCenterPoint: function(element) {
      var bbox = element.getBBox()
      return {
        x0: bbox.x + (bbox.width / 2),
        x1: bbox.x + (bbox.width / 2),
        y0: bbox.y + (bbox.height / 2),
        y1: bbox.y + (bbox.height / 2)
      }
    }
  }

  refugees = refugeesRaw.filter(function(d) { return d.Year == year })

  var containers = nodes.selectAll('.node')
    .data(refugees)
    .enter()
    .append("g")
    .attr("class", "node")

  var totalRefugees = {}
  var totalRefugeesHelped = {}
  var maxRefugees = 0

  for (var index = 0; index < refugees.length; index++) {
    var datum = refugees[index]
    var key = datum.Asylum.toUpperCase()
    if (totalRefugees[key]) {
      totalRefugees[key] += datum.RefugeeLikeSituation
      totalRefugeesHelped[key] += datum.RefugeeLikeSituationAssisted
    } else {
      totalRefugees[key] = datum.RefugeeLikeSituation
      totalRefugeesHelped[key] = datum.RefugeeLikeSituationAssisted
    }
  }

  for (var key in totalRefugees) {
    if (totalRefugees.hasOwnProperty(key) && totalRefugees[key] > maxRefugees)
      maxRefugees = totalRefugees[key]
  }

  countries.selectAll('path')
    .data(window.countries_data.features) // get the data here: https://gist.github.com/2969317
    .enter()
    .append('svg:path')
    .attr('d', path)
   .attr('fill', function(d) {
      if (!totalRefugees[d.properties.name.toUpperCase()])
        return "white"
      var lightness = ((totalRefugees[d.properties.name.toUpperCase()] / maxRefugees) * .7) + .2

      return d3.hsl(0, .6, 1 - (lightness))
   })
   .attr('stroke', 'rgba(0,0,0, 1)')
   .attr('stroke-width', 1)
   .attr("id", function(d) {
     if (d.properties.name)
       return d.properties.name.toUpperCase().toUpperCase().replace(/ /g, "_")
   })
   .on("mouseover", brighten(1))
   .on("mouseout", brighten(0))

  containers
    .append('svg:path')
    .attr('d', function(d) {
      var asylum = d3.select('#' + d.Asylum.toUpperCase().replace(/ /g, "_"))
      var origin = d3.select('#' + d.Origin.toUpperCase().replace(/ /g, "_"))
      if (d.Asylum === "United States") {
        console.log(d.Asylum)
        console.log(d.Origin)
      }
      if (!asylum || !origin || !asylum[0] || !origin[0] || !asylum[0][0] || !origin[0][0])
        return
      var end = helper.getCenterPoint(asylum[0][0])
      var start = helper.getCenterPoint(origin[0][0])
      var width = ((d.RefugeeLikeSituation / totalRefugees[d.Asylum.toUpperCase()]) * maxWidth) + minWidth
      var newStart = createTriangleFromLine(start, end, width)
      return area([newStart, end])
    })
    .attr('class', function(d) { d.Asylum.toUpperCase() })
    .attr("class", "arrow")
    .attr("display", "none")
    .attr("fill", "black")
    .attr('stroke', 'rgba(0,0,0,0)')
    .attr('stroke-width', 0)


  function brighten(opacity) {
    return function(g, i) {
      $("#info").html(function() {
         var txt = g.properties.name + ": " + totalRefugees[g.properties.name.toUpperCase()]
         txt += "<br />"
         txt += ((totalRefugeesHelped[g.properties.name.toUpperCase()] / totalRefugees[g.properties.name.toUpperCase()]) * 100).toFixed(2) + "% helped by UNHCR"
         return txt
      })
      nodes.selectAll("g.node path")
        .filter(function(d) {
          return d.Asylum.toUpperCase() != g.properties.name.toUpperCase()
        })
      nodes.selectAll("g.node path")
        .filter(function(d) {
          return d.Asylum.toUpperCase() == g.properties.name.toUpperCase()
        })
        .transition()
          .style("display", function(d) { if (opacity === 1) return "inline" })
          .style("stroke-width", 1)
    }
  }

  function createTriangleFromLine(start, end, base) {
    var xLength = end.x0 - start.x0
    var yLength = -(end.y0 - start.y0)
    var theta = (Math.PI / 2) - Math.atan(yLength / xLength)
    var hypotenuse = base / 2
    var yBaseLength = hypotenuse * Math.sin(theta)
    var xBaseLength = hypotenuse * Math.cos(theta)
    return {
      x0: start.x0 - xBaseLength,
      x1: start.x1 + xBaseLength,
      y0: start.y0 - yBaseLength,
      y1: start.y1 + yBaseLength
    }
  }



  function focus() {
    return function(g, i) {
      console.log("Focusuing")
    }
  }

  function redraw() {
    console.log("here", d3.event.translate, d3.event.scale);
    svg.attr("transform",
        "translate(" + d3.event.translate + ")"
        + " scale(" + d3.event.scale + ")");
    svg.selectAll("g.node path")
      .attr("transform", "scale(1)")
  }



}
$(document).ready(function() {
  map(2006)

  $("input[name=year]").change(function() {
    $("#map_container").html("")
    map(parseInt($(this).val()))
  })
})
