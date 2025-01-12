// setPublicNotes.js
// Find all notes that have the Write access of Public

const token = "";
const connectHeaders = { "Content-type": "application/json; charset=UTF-8", "Authorization": `Bearer ${token}` };
const baseurl = "https://api.maximizer.com/octopus";
const pubKey = "VXNlcgkq";

let noteKeyList = [];

async function getPublicNotes(connectHeaders, baseurl, pubKey, noteKeyList) {
	let method = "Read";
	let endpoint = `${baseurl}/${method}`;
	let request = {
		"Note": {
			"Criteria": {
				"SearchQuery": {
					"SecAccess/Write": {
						"$EQ": {
							"Key": pubKey
						}
					}
				},
				"Top": 100
			},
			"Scope": {
				"Fields": {
					"Key": 1,
					"ParentKey": 1
				}
			}
		},
		"Configuration": {
			"Drivers": {
				"INoteSearcher": "Maximizer.Model.Access.Sql.NoteSearcher"
			}
		},
		"Compatibility": {
			"NoteKey": "2.0"
		}
	};
	let test_request = {
		"Note": {
			"Criteria": {
				"SearchQuery": {
					"$AND": [
						{
							"SecAccess/Write": {
								"$EQ": {
									"Key": pubKey
								}
							}
						},
						{
							"$OR": [{
								"ParentKey": {
									"$EQ": {
										"Id": "161013251700100391969C"
									}
								}
							},{
								"ParentKey": {
									"$EQ": {
										"Id": "161122251802101290596C"
									}
								}
							}
						]
						}
					]
				},
				"Top": 100
			},
			"Scope": {
				"Fields": {
					"Key": 1,
					"ParentKey": 1
				}
			}
		},
		"Configuration": {
			"Drivers": {
				"INoteSearcher": "Maximizer.Model.Access.Sql.NoteSearcher"
			}
		},
		"Compatibility": {
			"NoteKey": "2.0"
		}
	};
	let connectOptions = { method: "POST", body: JSON.stringify(request), headers: connectHeaders };
	let maReq = {
		reqType: endpoint,
		connectMeta: connectOptions
	};
	
	try {
		const response = await fetch(maReq.reqType, maReq.connectMeta);
		const pkg = await response.json();
		if (pkg.Code >= 0) {
			for (let count = 0; count < pkg.Note.Data.length; count++) {
				// Disregard default notes or orphaned notes
				if (pkg.Note.Data[count].ParentKey != null) {
					noteKeyList.unshift({
						"abEntryKey": pkg.Note.Data[count].ParentKey,
						"noteKey": pkg.Note.Data[count].Key
					});
				}
			}
			return noteKeyList;
		} else {
			console.log("<getPublicNotes> MaxAPI Code " + pkg.Code + ": " + pkg.Msg[0].Message);
			return noteKeyList;
		}
	} catch (error) {
		console.log("<getPublicNotes> ERROR! (fetch/response): " + error);
	}
}

async function getSecurityAbEntry(connectHeaders, baseurl, noteAbEntryKey) {
	let method = "Read";
	let endpoint = `${baseurl}/${method}`;
	let request = {
		"AbEntry": {
			"Criteria": {
				"SearchQuery": {
					"$AND": [{
						"Key": {
							"$EQ": noteAbEntryKey
						}
					}, {
						"SecAccess/Write": {
							"$NE": pubKey
						}
					}]
				}
				
			},
			"Scope": {
				"Fields": {
					"SecAccess": {
						"Write": {
							"Key": 1,
							"DisplayName": 1
						}
					}
				}
			}
		},
		"Configuration": {
			"Drivers": {
				"IAbEntrySearcher": "Maximizer.Model.Access.Sql.AbEntrySearcher"
			}
		}
	};
	let connectOptions = { method: "POST", body: JSON.stringify(request), headers: connectHeaders };
	let maReq = {
		reqType: endpoint,
		connectMeta: connectOptions
	};
	
	try {
		const response = await fetch(maReq.reqType, maReq.connectMeta);
		const pkg = await response.json();
		if (pkg.Code >= 0) {
			if (pkg.AbEntry.Data.length > 0) {
				if (pkg.AbEntry.Data[0].SecAccess.Write.length > 0) {
					return pkg.AbEntry.Data[0].SecAccess.Write[0].Key;
				} else {
					console.log("<getSecurityAbEntry> Result Error: Security Group does not exist (No key generated).");
				}
			} else {
				console.log(noteAbEntryKey + " - <getSecurityAbEntry> Result Error: No security applied to AbEntry (AbEntry is public).");
				return null;
			}
		} else {
			console.log(noteAbEntryKey + " - <getSecurityAbEntry> MaxAPI Code " + pkg.Code + ": " + pkg.Msg[0].Message);
			return null;
		}
	} catch (error) {
		console.log("<getSecurityAbEntry> ERROR! (fetch/response): " + error);
	}
}

async function setNoteSecurity(connectHeaders, baseurl, noteKey, secGrpKey) {
	let method = "Update";
	let endpoint = `${baseurl}/${method}`;
	let request = {
		"Note": {
			"Data" :{
				"Key": noteKey,
				"SecAccess": {
					"Read": secGrpKey,
					"Write": secGrpKey
				}
			}
		},
		"Compatibility": {
			"NoteKey": "2.0"
		}
	};
	let connectOptions = { method: "POST", body: JSON.stringify(request), headers: connectHeaders };
	let maReq = {
		reqType: endpoint,
		connectMeta: connectOptions
	};

	try {
		const response = await fetch(maReq.reqType, maReq.connectMeta);
		const pkg = await response.json();
		if (pkg.Code >= 0) {
			//TODO: retrieve data in here.
			return pkg.Data;
		} else {
			console.log(noteKey + "-" + secGrpKey + "-" + "<setSecurityNote> MaxAPI Code " + pkg.Code + ": " + pkg.Msg[0].Message);
		}
	} catch (error) {
		console.log("<setSecurityNote> ERROR! (fetch/response): " + error);
	}
}


console.log("Reading AbEntry Note Keys . . .");

if (token == "") {
	console.log("ERROR! Token Not Set! You must set a personal access token to your Maximizer database before you can process notes.");
} else {
	getPublicNotes(connectHeaders, baseurl, pubKey, noteKeyList).then((nkl) => {
		if (nkl.length > 0) {
			console.log(nkl);
			for (let count = 0; count < nkl.length; count++) {
				nkl[count].writeAccessKey = getSecurityAbEntry(connectHeaders, baseurl, nkl[count].abEntryKey);
				nkl[count].writeAccessKey.then((secGrpKey) => {
					setNoteSecurity(connectHeaders, baseurl, nkl[count].noteKey, secGrpKey).then((res) => console.log(res));
				});
			}
		} else {
			console.log("EMPTY: There are no Public Notes; nothing to process.");
		}
	});
}
