# ArcGIS — Learning Package

> Learning ID: 002 | Status: OPEN
> Context: Job preparation — need practical GIS fundamentals
> Created: 2026-03-06

---

## What is ArcGIS?

ArcGIS is Esri's suite of GIS (Geographic Information Systems) software for working with spatial data — maps, geographic analysis, and location-based decision making. The two main platforms are:

- **ArcGIS Pro** — Desktop application for professional GIS work (analysis, cartography, data management)
- **ArcGIS Online** — Cloud-based platform for web maps, dashboards, and sharing spatial data

Key concepts you'll encounter: layers, feature classes, shapefiles, geodatabases, spatial analysis, geoprocessing, coordinate systems, and symbology.

---

## 5 Free Learning Resources

### 1. Esri — GIS Basics (Web Course)
**What:** Self-paced intro covering GIS terminology, capabilities, and how to use GIS tools to visualise and analyse spatial data. No prior knowledge required.
**URL:** https://www.esri.com/training/catalog/5d9cd7de5edc347a71611ccc/gis-basics/
**Time:** ~3 hours
**Priority:** Do this FIRST — establishes vocabulary and concepts.

### 2. Esri — Top 3 Free Courses for ArcGIS Beginners
**What:** Esri's own curated beginner path including ArcGIS Pro Basics, ArcGIS Online Basics, and introductory spatial analysis. Taught by Esri trainers.
**URL:** https://community.esri.com/t5/esri-training-blog/top-3-free-courses-for-arcgis-beginners/ba-p/1103138
**Time:** ~6-8 hours total
**Priority:** Do this SECOND — hands-on with the actual software.

### 3. Learn ArcGIS — Guided Tutorials
**What:** Real-world, scenario-based tutorials (e.g. analysing flood risk, mapping habitat). Each tutorial walks through a complete workflow. Can be done without an account, but sign up for a free public account to save work.
**URL:** https://learn.arcgis.com/en/gallery/
**Time:** 1-2 hours per tutorial, pick 3-4 relevant ones
**Priority:** Do this THIRD — builds applied skills.

### 4. Coursera — Fundamentals of GIS (UC Davis)
**What:** University-level course covering how GIS evolved from paper maps, foundational concepts, spatial data types, and making your first map. Free to audit (click "Audit the course" when enrolling).
**URL:** https://www.coursera.org/learn/gis
**Time:** ~16 hours (4 weeks at 4 hrs/week, but can be compressed)
**Priority:** Optional deep-dive if you want academic grounding.

### 5. ArcGIS Pro Quick-Start Tutorials (Esri Documentation)
**What:** Official quick-start tutorials built into the ArcGIS Pro documentation. Covers the interface, basic workflows, and core tools with step-by-step instructions.
**URL:** https://pro.arcgis.com/en/pro-app/latest/get-started/pro-quickstart-tutorials.htm
**Time:** ~4-6 hours
**Priority:** Reference material — use alongside resources 2 and 3.

---

## Recommended Learning Path

Given your existing technical skills (scripting, data, structured workflows), you don't need to start from absolute zero. Focus on GIS-specific concepts and the ArcGIS interface.

### Week 1 — Concepts and Vocabulary
1. Complete **GIS Basics** (Resource 1) — get the language down
2. Read through the first module of **Fundamentals of GIS** (Resource 4) for context on how GIS works conceptually

### Week 2 — Hands-On with ArcGIS
1. Work through the **Top 3 Beginner Courses** (Resource 2) — focus on ArcGIS Pro Basics and ArcGIS Online Basics
2. Sign up for the [ArcGIS Pro free trial](https://www.esri.com/en-us/arcgis/products/arcgis-pro/trial) if you don't have access

### Week 3 — Applied Workflows
1. Pick 3-4 **Learn ArcGIS tutorials** (Resource 3) relevant to the job domain
2. Use the **Quick-Start Tutorials** (Resource 5) as reference when you get stuck

### Ongoing — Interview Preparation
- Be able to explain: layers, feature classes, geodatabases, coordinate systems, spatial joins, buffering, and geoprocessing
- Know the difference between ArcGIS Pro (desktop) and ArcGIS Online (cloud)
- Understand common data formats: shapefiles (.shp), file geodatabases (.gdb), GeoJSON, CSV with coordinates
- If the role involves Python: Esri's Python library is called **ArcPy** — there are free Esri courses for this too

---

## Key Terms to Know for Interview

| Term | Meaning |
|------|---------|
| Layer | A visual representation of geographic data on a map |
| Feature Class | A collection of geographic features with the same geometry type |
| Shapefile | A common GIS file format (.shp + supporting files) |
| Geodatabase | Esri's native data storage format for spatial data |
| Geoprocessing | Automated GIS operations (buffer, clip, intersect, merge) |
| Spatial Analysis | Examining locations, patterns, and relationships in geographic data |
| Coordinate System | The reference framework for locating features on Earth |
| Basemap | The background map (satellite, streets, terrain) under your data |
| Symbology | How features are visually styled on the map |
| Attribute Table | The tabular data attached to geographic features |
| Spatial Join | Joining datasets based on geographic location rather than a key field |
| Buffer | Creating a zone of a specified distance around a feature |
| Web Map | An interactive map hosted online via ArcGIS Online |

---

## Notes

- ArcGIS Pro requires Windows (no Mac/Linux native version)
- ArcGIS Online works in any browser
- Free trial gives 21 days of ArcGIS Pro access — time your trial to align with active learning
- Your PowerShell skills transfer well — ArcGIS Pro supports Python (ArcPy) for automation
