var http = require('http');
var fs = require('fs');
var city = require('./city.json');
var urlencode = require('urlencode');

async function curlGet(url) {
	let json = await new Promise((resolve, reject) => {
		setTimeout(() => {
			var options = {
				hostname: 'apis.map.qq.com',
				path: url,
				method: 'get',
				headers: {
					'Content-Type': 'application/json',
				    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
				}
			};
			console.log(`http://${options.hostname}${url}`);
			let req = http.request(options, (res) => {
				let size = 0;
    			let chunks = [];
				res.on('data', (chunk) => {
					size += chunk.length;
      				chunks.push(chunk);
				});
				res.on('end', () => {
					let data = Buffer.concat(chunks, size);
					try {
						resolve(JSON.parse(data.toString()));
					} catch(e) {
						reject(e);
					}
				})
			});
			req.on('error', (e) => {
				reject(e);
			});
			req.end();
		}, 1000);
	});
	return json;
}

async function generateLatLng(city) {
	let format = [];
	let url = '/ws/district/v1/search?&keyword=${key}&key=Y7GBZ-W6XKQ-5YF5L-GKI4K-VD2H2-GIF7O';
	for (let i = 0; i < city.length; i++) {
		let provinceName = city[i]['n'];	
		let provinceObj = {
			text: provinceName,
			value: provinceName,
		};
		let sub = city[i]['s'];
		if (sub) {
			for (let j = 0; j < sub.length; j++) {
				let cityName = sub[j]['n'];

				let sub2 = sub[j]['s'];
				if (sub2) {
					for (let k = 0; k < sub2.length; k++) {
						let regionName = sub2[k]['n'];

						if (!provinceObj['sub']) {
							provinceObj['sub'] = [];
						}

						if (!provinceObj['sub'][j]) {
							provinceObj['sub'][j] = {};
						}									
						provinceObj['sub'][j]['text'] = cityName;
						provinceObj['sub'][j]['value'] = cityName;

						await curlGet(url.replace('${key}', urlencode(regionName))).then((data) => {
							let result = data.result.length > 0 ? data.result[0] : [];
							let realPos = getRealPos(result, provinceName, cityName);
							if (realPos) {
								if (!provinceObj['sub'][j]['sub']) {
									provinceObj['sub'][j]['sub'] = [];
								}
								let regionItem = {
									text: regionName,
									value: regionName,
									location: {
										lat: realPos.location.lat,
										lng: realPos.location.lng,
									}	
								} 
								provinceObj['sub'][j]['sub'].push(regionItem);
							}
						}).catch((error) => {

						});	
					}
				} else {
					await curlGet(url.replace('${key}', urlencode(cityName))).then((data) => {
						let result = data.result.length > 0 ? data.result[0] : [];
						let realPos = getRealPos(result, provinceName, cityName);
						if (realPos) {
							if (!provinceObj['sub']) {
								provinceObj['sub'] = [];
							}
							let cityItem = {
								text: cityName,
								value: cityName,
								location: {
									lat: realPos.location.lat,
									lng: realPos.location.lng,
								}	
							} 
							provinceObj['sub'].push(cityItem);
						}
					}).catch((error) => {

					});	
				}
			}
		} else {
				await curlGet(url.replace('${key}', urlencode(provinceName))).then((data) => {
					let result = data.result.length > 0 ? data.result[0] : [];
					let realPos = getRealPos(result, provinceName, '');
					if (realPos) {
						provinceObj['location'] = {
							lat: realPos.location.lat,
							lng: realPos.location.lng,
						};
					}
				}).catch((error) => {

				});	
		}
		format.push(provinceObj);
	}
	let formatStr = JSON.stringify(format);
	fs.writeFileSync('./city-location.json', formatStr, {
		encoding: 'utf8',
	});
}

const getRealPos = (results, provinceName, cityName) => {
	let realPos = null;

	provinceName = provinceName.replace(/(市|区|省|县)$/, '');
	cityName = cityName.replace(/(市|区|省|县)$/, '');
	let regxProvince = new RegExp('^'+provinceName);
	let regxCity = new RegExp('^' + cityName);
	
	results.forEach((element, index) => {		
		let address = element.address.split(',');
		if (regxProvince.test(address[0]) && regxCity.test(address[1])) {
			realPos = Object.assign({}, element);
		}	
	});
	return realPos;
}

generateLatLng(city);
