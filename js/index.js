//'use strict';
/* global gapi google $ Vue */

const PDFJS = window['pdfjs-dist/build/pdf'];
let vm;
//((Vue, PDFJS) => {
	
	// The Browser API key obtained from the Google API Console.
	// Replace with your own Browser API key, or your own key.
	const clientId = '771374960851-vp70fu1863736ulpli2lll68shae2p6m.apps.googleusercontent.com';
	const developerKey = 'AIzaSyBM77E7eM1CMBXvMu5XJ4i6XLhRx3RPlt4';
	const appId = 'refined-iridium-181914';
	const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
	
	// Scope to use to access user's Drive items.
	const scope = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.install'];
	
	let pickerApiLoaded = false;
	let oauthToken;
	
	let authorizeButton,
		signoutButton,
		urlInput,
		pickerButton,
		printButton,
		result;
	
	document.addEventListener('DOMContentLoaded', () => {console.log('DOMContentLoaded');
		const multiPrinter = new MultiPrinter();
		
		authorizeButton = document.getElementById('authorize-button');
		signoutButton = document.getElementById('signout-button');
		urlInput = document.getElementById('url-input');
		pickerButton = document.getElementById('picker-btn');
		printButton = document.getElementById('print-btn');
		pickerButton.onclick = multiPrinter.createPicker;
		printButton.onclick = multiPrinter.printDocs;
		result = document.getElementById('result');
		const state = JSON.parse(getParameterByName('state'));
		if (state){console.log(state);
			if (state.ids){
				urlInput.value = state.ids.join('\n');
			} else if (state.exportIds){
				urlInput.value = state.exportIds.join('\n');
			}
		}
		
		const printer = new MultiPrinter();
		printer.loadAPIs();
		
		vm = new Vue({
			el: '#vue-wrapper',
			data: {
				printer: printer,
				errors: [],
				
			},
		});
		
		console.log('hi!');
		vm.printer.loadAPIs();
		
	});
	
	function getParameterByName(name, url) { //https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
	
	class MultiPrinter {
		
		constructor(){
			
		}
		
		loadAPIs(){ // Use the Google API Loader script to load the google.picker script.
			gapi.load('auth', { callback: () => this.onAuthApiLoad() });
			gapi.load('picker', { callback: () => this.onPickerApiLoad() });
			gapi.load('client:auth2', { callback: () => this.initClient() });console.log('loadinggg');
		}
		
		initClient() {console.log('initClient');
			const initStuff = gapi.client.init({
				apiKey: developerKey,
				clientId: clientId,
				discoveryDocs: DISCOVERY_DOCS,
				scope: scope
			}).then(() => {console.log('initClientt');
				// Listen for sign-in state changes.
				gapi.auth2.getAuthInstance();/*.isSignedIn.listen(updateSigninStatus);
				// Handle the initial sign-in state.
				updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());*/
			}, err => console.error(err), err => console.error(err));
			console.log(initStuff);
		}
		
		onAuthApiLoad() {console.log('onAuthApiLoad');
			window.gapi.auth.authorize({
				'client_id': clientId,
				'scope': scope,
				'immediate': false
			}, () => this.handleAuthResult());
		}
		
		onPickerApiLoad() {
			pickerApiLoaded = true;
			pickerButton.onclick = () => this.createPicker();
		}
		
		handleAuthResult(authResult) {
			if (authResult && !authResult.error) {
				oauthToken = authResult.access_token;
				//gapi.load('drive',{ callback: ()=>{console.log('got drive');} });
			}
		}
		
		createPicker() {
			if (pickerApiLoaded && oauthToken) {
				const view = new google.picker.View(google.picker.ViewId.DOCS);
				//view.setMimeTypes("image/png,image/jpeg,image/jpg");
				const picker = new google.picker.PickerBuilder()
					.addView(google.picker.ViewId.DOCS)
					.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
					.setOAuthToken(oauthToken)
					.setDeveloperKey(developerKey)
					.setAppId(appId)
					.setCallback(() => this.pickerCallback())
					.build();
				picker.setVisible(true);
			}
		}
		
		pickerCallback(data) {
			if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
				urlInput.value = data[google.picker.Response.DOCUMENTS]
					.map(doc => doc[google.picker.Document.ID])
					.join('\n');
			}
		}
		
		printDocs(){
			result.innerHTML = '';
			let docsRendered = 0;
			let idList = urlInput.value.split('\n').filter(id => !!id);
			$('#render-progress').attr('max', idList.length)
				.attr('value', 0);
			idList.forEach((id, docNum, ids) => {console.log(ids);
				setTimeout(() => {console.log('timeout!');
					gapi.client.drive.files.export({
						fileId: id,
						mimeType: 'application/pdf'
					})
						.then(response => {console.log(response);
							try {
								PDFJS.getDocument({
									data: response.body
								}).then(pdf => {
									console.log('Got a PDF: %s', pdf);
									let pagesRendered = 0;
									for (let i = 1; i < pdf.numPages + 1; i ++){console.log(i);
										pdf.getPage(i).then(page => {
											let canvas = document.createElement('canvas');
											result.appendChild(canvas);
											canvas.width = page.pageInfo.view[2];
											canvas.height = page.pageInfo.view[3];
											page.render({
												canvasContext: canvas.getContext('2d'),
												viewport: page.getViewport(1),
											}).then(() => {
												console.log('rendered');
												pagesRendered ++;
												console.log(`doc ${docNum}, pages: ${pagesRendered} / ${pdf.numPages}`);
												if (pagesRendered === pdf.numPages){
													docsRendered ++;
													$('#render-progress').attr('value', +$('#render-progress').attr('value') + 1);
													console.log(`docs: ${docsRendered} / ${ids.length}`);
													if (docsRendered === ids.length){
														console.log('all rendered!');
														window.print();
													}
												}
											});
										}, err => {
											this.handleRenderFail(id, err);
										}); // done rendering page);
									}
								}, err => this.handleRenderFail(id, err)); // done getting document
							} catch (err) {
								this.handleRenderFail(id, err);
							} 
						}, err => this.handleRenderFail(id, err));
				}, 1500 * docNum);
			});
		}
		
		handleRenderFail(id, err = null){//alert('ah error');
			if (err) {
				console.error(err);
				$('#render-progress').attr('value', +$('#render-progress').attr('value') + 1);
				if (+$('#render-progress').attr('value') === +$('#render-progress').attr('max')){
					//window.print();
				}
				gapi.client.drive.files.get({
					fileId: id,
					fields: 'webViewLink, name'
				})
					.then(response => {
						console.log(response);
						console.log(`<div>Error: could not print <a target="_blank" href="${response.result.webViewLink}">${response.result.name}</a></div>`);
						$('#errors').append(`<div class="error">Error: could not print <a target="_blank" href="${response.result.webViewLink}">${response.result.name}</a></div>`);
					}, err => {
						console.error(err);
						$('#errors').append(`<div class="error">Error: could not find file with ID "${id}"</div>`);
					});
			}
		}
		
	}
	
	// Create and render a Picker object for searching images.
	
	// A simple callback implementation.
	
//})(Vue, window['pdfjs-dist/build/pdf'].PDFJS);
