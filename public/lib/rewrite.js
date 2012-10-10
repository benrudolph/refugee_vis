var World = function(selector, refugeeData) {
  this.year = 2006
  this.selector = selector
  this.xy = d3
      .geo
      .equirectangular()
      .scale($(selector).width())
      .translate([$(selector).width() / 2, $(selector).height() / 2])

  this.path = d3
      .geo
      .path()
      .projection(this.xy)


  this.svg = d3
      .select(selector)
      .append("svg:svg")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().on("zoom", this.redraw.bind(this)))
      .append("svg:g")

  this.countries = this.svg
      .append("svg:g")
      .attr("id", "countries")

  this.nodes = this.svg
      .append("svg:g")
      .attr("id", "routes")

  this.arrow = d3
      .svg
      .area()
        .x0(function(d) { return d.x0 })
        .x1(function(d) { return d.x1 })
        .y0(function(d) { return d.y0 })
        .y1(function(d) { return d.y1 })

  this.area = d3.svg.area()
    .x0(function(d) { return d.x0 })
    .x1(function(d) { return d.x1 })
    .y0(function(d) { return d.y0 })
    .y1(function(d) { return d.y1 })

  this.maxWidth = 30
  this.minWidth = 1

  // Refugee dictionary sorted with keys of each year
  this.refugees = (function() {
    var r = {}
    for (var i = 0; i < refugeeData.length; i++) {
      if (!r.hasOwnProperty(refugeeData[i].Year)) {
        r[refugeeData[i].Year] = []
      }
      r[refugeeData[i].Year].push(refugeeData[i])
    }
    return r
  })()

  this.totalRefugees = {}
  this.totalRefugeesAssisted = {}
  this.maxRefugees = {}

  for (var year in this.refugees) {
    var refugeesForYear = this.refugees[year]
    this.totalRefugees[year] = {}
    this.totalRefugeesAssisted[year] = {}
    for (var i = 0; i < refugeesForYear.length; i++) {
      var datum = refugeesForYear[i]
      var key = datum.Asylum.toUpperCase()
      if (this.totalRefugees[year][key]) {
        this.totalRefugees[year][key] += datum.RefugeeLikeSituation
        this.totalRefugeesAssisted[year][key] += datum.RefugeeLikeSituationAssisted
      } else {
        this.totalRefugees[year][key] = datum.RefugeeLikeSituation
        this.totalRefugeesAssisted[year][key] = datum.RefugeeLikeSituationAssisted
      }
    }
  }

  for (var year in this.totalRefugees) {
    this.maxRefugees[year] = 0
    for (var key in this.totalRefugees[year]) {
      if (this.totalRefugees[year].hasOwnProperty(key) &&
          this.totalRefugees[year][key] > this.maxRefugees[year]) {
        this.maxRefugees[year] = this.totalRefugees[year][key]
      }
    }
  }
}

World.prototype.getElementCenterPoints = function(element) {
  var bBox = element.getBBox()
  return {
    x0: bBox.x + (bBox.width / 2),
    x1: bBox.x + (bBox.width / 2),
    y0: bBox.y + (bBox.height / 2),
    y1: bBox.y + (bBox.height / 2)
  }
}

World.prototype.map = function(year) {
  this.year = year
  $(this.selector + " #countries path").remove()
  $(this.selector + " #routes .node").remove()

  var that = this

  this.countries
      .selectAll("path")
      .data(window.countries_data.features)
      .enter()
      .append("svg:path")
      .attr("d", this.path)
      .attr("fill", function(d) {
        if (!that.totalRefugees[year][d.properties.name.toUpperCase()])
          return "rgb(130,130,130)"
        var lightness = ((that.totalRefugees[year][d.properties.name.toUpperCase()] /
            that.maxRefugees[year]) * .8)

        return d3.hsl(0, .6, 1 - (lightness))
      })
      .attr("stroke", "rgb(0,0,0)")
      .attr("stroke-width", 1)
      .attr("id", function(d) {
        if (d.properties.name)
          return d.properties.name.toUpperCase().toUpperCase().replace(/ /g, "_")
      })
     .on("mouseover", this.show(true))
     .on("mouseout", this.show(false))

  var containers = this.nodes.selectAll('.node')
      .data(this.refugees[year])
      .enter()
      .append("g")
      .attr("class", "node")


  containers
      .append("svg:path")
      .attr("d", function(d) {
        var asylum = d3.select("#" + d.Asylum.toUpperCase().replace(/ /g, "_"))
        var origin = d3.select("#" + d.Origin.toUpperCase().replace(/ /g, "_"))
        if (!asylum || !origin || !asylum.node() || !origin.node())
          return

        var lineEnd = that.getElementCenterPoints(asylum.node())
        var lineStart = that.getElementCenterPoints(origin.node())
        var width = ((d.RefugeeLikeSituation / that.totalRefugees[year][d.Asylum.toUpperCase()])
            * that.maxWidth) + that.minWidth

        var triangleStart = that.createTriangleStartFromLine(lineStart, lineEnd, width)
        return that.area([triangleStart, lineEnd])
      })
      .attr("class", function(d) { d.Asylum.toUpperCase() })
      .attr("class", "arrow")
      .attr("display", "none")
      .attr("fill", "black")
      .attr('stroke', 'rgba(0,0,0,0)')
      .attr('stroke-width', 0)

}

World.prototype.show = function(show) {
  var that = this
  return function(g, i) {
    $("#info").html(function() {
      var txt = g.properties.name + ": " + that.totalRefugees[that.year][g.properties.name.toUpperCase()]
      txt += "<br />"
      txt += ((that.totalRefugeesAssisted[that.year][g.properties.name.toUpperCase()] /
          that.totalRefugees[that.year][g.properties.name.toUpperCase()]) * 100).toFixed(2) +
          "% helped by UNHCR"
      return txt
    })

    that.nodes.selectAll("g.node path")
        .filter(function(d) {
          return d.Asylum.toUpperCase() == g.properties.name.toUpperCase()
        })
        .transition()
          .style("display", function(d) { if (show) return "inline" })
  }
}


World.prototype.createTriangleStartFromLine = function(start, end, base) {
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

World.prototype.redraw = function() {
  console.log("here", d3.event.translate, d3.event.scale);
  this.svg.attr("transform",
      "translate(" + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
  this.svg.selectAll("g.node path")
    .attr("transform", "scale(1)")
}

$(document).ready(function() {
  var world = new World("#map_container", refugeesRaw)
  world.map(2006)

  $("input[name=year]").change(function() {
    world.map(parseInt($(this).val()))
  })
})
