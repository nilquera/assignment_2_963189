#!/bin/bash

mkdir korkeasaari_zoo
cd korkeasaari_zoo

wget -r -np -nH --cut-dirs=3 -R index.html -A .csv https://iot.fvh.fi/downloads/tortoise/