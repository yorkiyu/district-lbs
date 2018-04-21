var http = require('http');
var city = require('./city.json');
var urlencode = require('urlencode');

async function curlGet(url) {
	let json = await new Promise((resolve, rej) => {
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
			
			let req = http.request(options, (res) => {
				let size = 0;
    			let chunks = [];
				res.on('data', (chunk) => {
					size += chunk.length;
      				chunks.push(chunk);
				});
				res.on('end', () => {
					let data = Buffer.concat(chunks, size);
					resolve(JSON.parse(data.toString()));
				})
			});
			req.on('error', (e) => {
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
		let province = {};
		let sub = city[i]['s'];
		if (sub) {
			for (let j = 0; j < sub.length; j++) {
				let sub2 = sub[j]['s'];
				if (sub2) {
					for (let k = 0; k < sub2.length; k++) {
						await curlGet(url.replace('${key}', urlencode(sub2[k]['n']))).then((data) => {
							let realPos = getRealPos(data.result, city[i]['n']);
						}).catch((error) => {
						});	
					}
				} else {
					await curlGet(url.replace('${key}', urlencode(sub[j]['n']))).then((data) => {
						let realPos = getRealPos(data.result, city[i]['n']);
					}).catch((error) => {
					});	
				}
			}
		} else {
				await curlGet(url.replace('${key}', urlencode(city[i]['n']))).then((data) => {
					let realPos = getRealPos(data.result, city[i]['n']);
				}).catch((error) => {
				});	
		}
		format.push(province);
	}
}

const getRealPos = (results, province) => {
	console.log(results.constructor == Array);
	console.log(results.length);
	let realPos = null;
	if (results.length === 0) {
		return null;
	} else if (results.length === 1) {
		return results[0];
	} else {
		province = province.replace(/(市|区|省|县)/, '');
		let regx = new RegExp('^'+province);
		for (let i = 0; i < results.length; i++) {
			if (regx.test(results[i].address)) {
				realPos = Object.assign({}, results[i]);
			}	
		}
	}
	console.log(realPos);
	return realPos;
}

generateLatLng(city);
