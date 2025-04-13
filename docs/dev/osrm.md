```sh
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/car/switzerland-latest.osm.pbf
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-extract -p /opt/foot.lua /data/foot/switzerland-latest.osm.pbf
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-extract -p /opt/bicycle.lua /data/bicycle/switzerland-latest.osm.pbf

docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-partition /data/car/switzerland-latest.osrm
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-partition /data/foot/switzerland-latest.osrm
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-partition /data/bicycle/switzerland-latest.osrm


docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-customize /data/car/switzerland-latest.osrm
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-customize /data/foot/switzerland-latest.osrm
docker run --rm -t -v "${PWD}/osm-files:/data" osrm/osrm-backend osrm-customize /data/bicycle/switzerland-latest.osrm

```