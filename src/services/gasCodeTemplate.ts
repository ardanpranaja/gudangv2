/**
 * Template Referensi Kontrak Google Apps Script (GAS) untuk GudangPresisi
 * Sesuai dengan spesifikasi kontrak API GAS Backend Version 1.2.4.
 * Backend deployment aktif di Google Apps Script adalah Single Source of Truth.
 */
export const GAS_CODE_TEMPLATE = `/**
 * GUDANGPRESISI - BACKEND GOOGLE APPS SCRIPT (GAS)
 * Version: 1.2.4 (Reference Contract Specification)
 * Database: Google Spreadsheet
 *
 * PENTING:
 * File ini merupakan referensi struktur dan kontrak API v1.2.4.
 * Backend production aktif dikelola langsung melalui Google Apps Script Deployment.
 */

const SHEETS = {
  MASTER_ITEM: 'MASTER_ITEM',
  MASTER_MEMBER: 'MASTER_MEMBER',
  MEMBER_LIMIT: 'MEMBER_LIMIT',
  TRANSAKSI: 'TRANSAKSI',
  PENGAJUAN_PENGAMBILAN: 'PENGAJUAN_PENGAMBILAN',
  PENGATURAN: 'PENGATURAN'
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'health';
  try {
    switch (action) {
      case 'health':
        return jsonResponse(handleHealth());
      case 'items':
        return jsonResponse(handleGetItems());
      case 'members':
        return jsonResponse(handleGetMembers());
      case 'limits':
        return jsonResponse(handleGetLimits());
      case 'transactions':
        return jsonResponse(handleGetTransactions(e.parameter));
      case 'stock':
        return jsonResponse(handleGetStock());
      case 'requests':
        return jsonResponse(handleGetRequests());
      case 'bincard': {
        var bincardItemId = (e && e.parameter && (e.parameter.id_item || e.parameter.itemId)) || '';
        return jsonResponse(handleGetBinCard(bincardItemId));
      }
      case 'memberhistory': {
        var histMemberId = (e && e.parameter && (e.parameter.id_member || e.parameter.memberId)) || '';
        return jsonResponse(handleGetMemberHistory(histMemberId));
      }
      case 'pickupeligibility': {
        var eligMemberId = (e && e.parameter && (e.parameter.id_member || e.parameter.memberId)) || '';
        var eligItemId = (e && e.parameter && (e.parameter.id_item || e.parameter.itemId)) || '';
        var eligJumlah = Number((e && e.parameter && (e.parameter.jumlah || e.parameter.qty)) || 1);
        return jsonResponse(handleCheckEligibility(eligMemberId, eligItemId, eligJumlah));
      }
      case 'debug_transactions':
        return jsonResponse(handleGetTransactions({ limit: 50 }));
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    var action = body.action || (e && e.parameter && e.parameter.action);

    switch (action) {
      case 'transaction':
        return jsonResponse(handlePostTransaction(body));
      case 'request':
        return jsonResponse(handlePostRequest(body));
      case 'approve_request':
        return jsonResponse(handleApproveRequest(body));
      case 'reject_request':
        return jsonResponse(handleRejectRequest(body));
      case 'limit':
        return jsonResponse(handlePostLimit(body));
      case 'init_sheets':
        return jsonResponse(initSheets());
      default:
        return jsonResponse({ success: false, error: 'Unknown POST action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function handleHealth() {
  var ss = getSS();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  return {
    success: true,
    data: {
      status: 'ONLINE',
      spreadsheetId: ss.getId(),
      sheetsFound: sheets,
      version: '1.2.4',
      timestamp: new Date().toISOString()
    }
  };
}

// Handler GET action=requests
function handleGetRequests() {
  var ss = getSS();
  var sheet = ss.getSheetByName(SHEETS.PENGAJUAN_PENGAMBILAN);
  if (!sheet) {
    return {
      success: true,
      action: 'requests',
      data: { count: 0, requests: [] }
    };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      success: true,
      action: 'requests',
      data: { count: 0, requests: [] }
    };
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var colMap = {};
  for (var i = 0; i < headers.length; i++) {
    colMap[headers[i]] = i;
  }

  var requests = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var idReq = String(row[colMap['ID_PENGAJUAN']] || '').trim();
    if (!idReq) continue;

    var req = {
      ID_PENGAJUAN: idReq,
      TANGGAL: row[colMap['TANGGAL']] ? String(row[colMap['TANGGAL']]).trim() : '',
      ID_MEMBER: String(row[colMap['ID_MEMBER']] || '').trim(),
      ID_ITEM: String(row[colMap['ID_ITEM']] || '').trim(),
      JUMLAH: Number(row[colMap['JUMLAH']] || 0),
      TANGGAL_TERAKHIR_AMBIL: row[colMap['TANGGAL_TERAKHIR_AMBIL']] ? String(row[colMap['TANGGAL_TERAKHIR_AMBIL']]).trim() : '',
      TANGGAL_SEHARUSNYA: row[colMap['TANGGAL_SEHARUSNYA']] ? String(row[colMap['TANGGAL_SEHARUSNYA']]).trim() : '',
      ALASAN: String(row[colMap['ALASAN']] || '').trim(),
      STATUS: String(row[colMap['STATUS']] || 'MENUNGGU').trim(),
      ID_APPROVER: String(row[colMap['ID_APPROVER']] || '').trim(),
      CATATAN_APPROVER: String(row[colMap['CATATAN_APPROVER']] || '').trim(),
      TIMESTAMP: row[colMap['TIMESTAMP']] ? String(row[colMap['TIMESTAMP']]).trim() : ''
    };
    requests.push(req);
  }

  // Urutkan berdasarkan TIMESTAMP terbaru ke terlama; fallback ke TANGGAL
  requests.sort(function(a, b) {
    var keyA = a.TIMESTAMP || a.TANGGAL || '';
    var keyB = b.TIMESTAMP || b.TANGGAL || '';
    return keyB.localeCompare(keyA);
  });

  return {
    success: true,
    action: 'requests',
    data: {
      count: requests.length,
      requests: requests
    }
  };
}

// Handler GET action=limits
function handleGetLimits() {
  var ss = getSS();
  var sheet = ss.getSheetByName(SHEETS.MEMBER_LIMIT);
  if (!sheet) {
    return {
      success: true,
      action: 'limits',
      data: { count: 0, limits: [] }
    };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      success: true,
      action: 'limits',
      data: { count: 0, limits: [] }
    };
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var colMap = {};
  for (var i = 0; i < headers.length; i++) {
    colMap[headers[i]] = i;
  }

  var limits = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var idLimit = String(row[colMap['ID_LIMIT']] || '').trim();
    if (!idLimit) continue;

    limits.push({
      ID_LIMIT: idLimit,
      ID_MEMBER: String(row[colMap['ID_MEMBER']] || '').trim(),
      ID_ITEM: String(row[colMap['ID_ITEM']] || '').trim(),
      MAX_QTY: Number(row[colMap['MAX_QTY']] || 0),
      SATUAN: String(row[colMap['SATUAN']] || '').trim(),
      STATUS: String(row[colMap['STATUS']] || 'AKTIF').trim(),
      CREATED_AT: row[colMap['CREATED_AT']] ? String(row[colMap['CREATED_AT']]).trim() : '',
      UPDATED_AT: row[colMap['UPDATED_AT']] ? String(row[colMap['UPDATED_AT']]).trim() : ''
    });
  }

  return {
    success: true,
    action: 'limits',
    data: {
      count: limits.length,
      limits: limits
    }
  };
}

// Handler POST action=limit (operations: create, update, deactivate, activate)
function handlePostLimit(body) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return {
      success: false,
      error: { message: 'Server backend sibuk (lock timeout). Silakan coba lagi beberapa saat.' }
    };
  }

  try {
    var operation = String(body.operation || body.op || '').trim().toLowerCase();
    var ss = getSS();
    var limitSheet = ss.getSheetByName(SHEETS.MEMBER_LIMIT);
    var memberSheet = ss.getSheetByName(SHEETS.MASTER_MEMBER);
    var itemSheet = ss.getSheetByName(SHEETS.MASTER_ITEM);

    if (!limitSheet) {
      return { success: false, error: { message: 'Sheet MEMBER_LIMIT tidak ditemukan di Spreadsheet.' } };
    }

    var limitData = limitSheet.getDataRange().getValues();
    var limitHeaders = limitData[0].map(function(h) { return String(h).trim(); });
    var colMap = {};
    for (var i = 0; i < limitHeaders.length; i++) {
      colMap[limitHeaders[i]] = i;
    }

    var now = new Date().toISOString();

    function getItemInfo(targetIdItem) {
      if (!itemSheet) return null;
      var iData = itemSheet.getDataRange().getValues();
      var iHeaders = iData[0].map(function(h) { return String(h).trim(); });
      var idIdx = iHeaders.indexOf('ID_ITEM');
      var satIdx = iHeaders.indexOf('SATUAN');
      var statusIdx = iHeaders.indexOf('STATUS');
      for (var r = 1; r < iData.length; r++) {
        if (String(iData[r][idIdx] || '').trim() === targetIdItem) {
          return {
            SATUAN: satIdx >= 0 ? String(iData[r][satIdx] || '').trim() : 'UNIT',
            STATUS: statusIdx >= 0 ? String(iData[r][statusIdx] || 'AKTIF').trim().toUpperCase() : 'AKTIF'
          };
        }
      }
      return null;
    }

    function getMemberInfo(targetIdMember) {
      if (!memberSheet) return null;
      var mData = memberSheet.getDataRange().getValues();
      var mHeaders = mData[0].map(function(h) { return String(h).trim(); });
      var idIdx = mHeaders.indexOf('ID_MEMBER');
      var statusIdx = mHeaders.indexOf('STATUS');
      for (var r = 1; r < mData.length; r++) {
        if (String(mData[r][idIdx] || '').trim() === targetIdMember) {
          return {
            STATUS: statusIdx >= 0 ? String(mData[r][statusIdx] || 'AKTIF').trim().toUpperCase() : 'AKTIF'
          };
        }
      }
      return null;
    }

    if (operation === 'create') {
      var idMember = String(body.ID_MEMBER || body.idMember || '').trim();
      var idItem = String(body.ID_ITEM || body.idItem || '').trim();
      var maxQty = Number(body.MAX_QTY || body.maxQty);
      var status = String(body.STATUS || body.status || 'AKTIF').trim().toUpperCase();

      if (!idMember) {
        return { success: false, error: { message: 'ID_MEMBER wajib diisi.' } };
      }
      if (!idItem) {
        return { success: false, error: { message: 'ID_ITEM wajib diisi.' } };
      }
      if (isNaN(maxQty) || maxQty <= 0) {
        return { success: false, error: { message: 'MAX_QTY harus berupa angka lebih besar dari 0.' } };
      }

      var memberInfo = getMemberInfo(idMember);
      if (!memberInfo) {
        return { success: false, error: { message: 'Member dengan ID ' + idMember + ' tidak ditemukan di MASTER_MEMBER.' } };
      }
      if (memberInfo.STATUS !== 'AKTIF') {
        return { success: false, error: { message: 'Member ' + idMember + ' berstatus NONAKTIF dan tidak dapat diberi limit.' } };
      }

      var itemInfo = getItemInfo(idItem);
      if (!itemInfo) {
        return { success: false, error: { message: 'Barang dengan ID ' + idItem + ' tidak ditemukan di MASTER_ITEM.' } };
      }
      if (itemInfo.STATUS !== 'AKTIF') {
        return { success: false, error: { message: 'Barang ' + idItem + ' berstatus NONAKTIF dan tidak dapat dikonfigurasi limit.' } };
      }

      // SATUAN strictly from MASTER_ITEM
      var satuan = itemInfo.SATUAN || 'UNIT';

      // Duplicate prevention: check if active limit already exists for (ID_MEMBER + ID_ITEM)
      for (var r = 1; r < limitData.length; r++) {
        var rowM = String(limitData[r][colMap['ID_MEMBER']] || '').trim();
        var rowI = String(limitData[r][colMap['ID_ITEM']] || '').trim();
        var rowS = String(limitData[r][colMap['STATUS']] || '').trim().toUpperCase();
        if (rowM === idMember && rowI === idItem && rowS === 'AKTIF') {
          return {
            success: false,
            error: { message: 'MEMBER_LIMIT aktif untuk ' + idMember + ' / ' + idItem + ' sudah ada.' }
          };
        }
      }

      // Generate ID_LIMIT (LIM000001 format)
      var maxSeq = 0;
      for (var r = 1; r < limitData.length; r++) {
        var rawId = String(limitData[r][colMap['ID_LIMIT']] || '').trim();
        var match = rawId.match(/^LIM(\d+)$/i);
        if (match) {
          var seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      var nextSeq = maxSeq + 1;
      var idLimit = 'LIM' + ('000000' + nextSeq).slice(-6);

      var newRow = [];
      newRow[colMap['ID_LIMIT']] = idLimit;
      newRow[colMap['ID_MEMBER']] = idMember;
      newRow[colMap['ID_ITEM']] = idItem;
      newRow[colMap['MAX_QTY']] = maxQty;
      newRow[colMap['SATUAN']] = satuan;
      newRow[colMap['STATUS']] = status || 'AKTIF';
      newRow[colMap['CREATED_AT']] = now;
      newRow[colMap['UPDATED_AT']] = now;

      limitSheet.appendRow(newRow);

      return {
        success: true,
        action: 'limit',
        data: {
          message: 'Limit member ' + idLimit + ' berhasil dibuat.',
          ID_LIMIT: idLimit
        }
      };

    } else if (operation === 'update') {
      var idLimit = String(body.ID_LIMIT || body.idLimit || '').trim();
      var maxQty = Number(body.MAX_QTY || body.maxQty);
      var status = body.STATUS ? String(body.STATUS).trim().toUpperCase() : undefined;

      if (!idLimit) {
        return { success: false, error: { message: 'ID_LIMIT wajib diisi untuk update.' } };
      }
      if (isNaN(maxQty) || maxQty <= 0) {
        return { success: false, error: { message: 'MAX_QTY harus berupa angka lebih besar dari 0.' } };
      }

      var rowIndex = -1;
      var existingRow = null;
      for (var r = 1; r < limitData.length; r++) {
        if (String(limitData[r][colMap['ID_LIMIT']] || '').trim() === idLimit) {
          rowIndex = r + 1;
          existingRow = limitData[r];
          break;
        }
      }

      if (rowIndex === -1 || !existingRow) {
        return { success: false, error: { message: 'ID_LIMIT ' + idLimit + ' tidak ditemukan di Spreadsheet.' } };
      }

      var idMember = String(existingRow[colMap['ID_MEMBER']] || '').trim();
      var idItem = String(existingRow[colMap['ID_ITEM']] || '').trim();

      if (status === 'AKTIF') {
        for (var r = 1; r < limitData.length; r++) {
          var otherId = String(limitData[r][colMap['ID_LIMIT']] || '').trim();
          var otherM = String(limitData[r][colMap['ID_MEMBER']] || '').trim();
          var otherI = String(limitData[r][colMap['ID_ITEM']] || '').trim();
          var otherS = String(limitData[r][colMap['STATUS']] || '').trim().toUpperCase();
          if (otherId !== idLimit && otherM === idMember && otherI === idItem && otherS === 'AKTIF') {
            return {
              success: false,
              error: { message: 'Gagal mengubah status: sudah ada MEMBER_LIMIT aktif untuk ' + idMember + ' / ' + idItem + '.' }
            };
          }
        }
      }

      var itemInfo = getItemInfo(idItem);
      var satuan = itemInfo ? itemInfo.SATUAN : String(existingRow[colMap['SATUAN']] || 'UNIT');

      limitSheet.getRange(rowIndex, colMap['MAX_QTY'] + 1).setValue(maxQty);
      limitSheet.getRange(rowIndex, colMap['SATUAN'] + 1).setValue(satuan);
      if (status) {
        limitSheet.getRange(rowIndex, colMap['STATUS'] + 1).setValue(status);
      }
      limitSheet.getRange(rowIndex, colMap['UPDATED_AT'] + 1).setValue(now);

      return {
        success: true,
        action: 'limit',
        data: {
          message: 'Limit member ' + idLimit + ' berhasil diperbarui.',
          ID_LIMIT: idLimit
        }
      };

    } else if (operation === 'deactivate') {
      var idLimit = String(body.ID_LIMIT || body.idLimit || '').trim();
      if (!idLimit) {
        return { success: false, error: { message: 'ID_LIMIT wajib diisi untuk nonaktifkan limit.' } };
      }

      var rowIndex = -1;
      for (var r = 1; r < limitData.length; r++) {
        if (String(limitData[r][colMap['ID_LIMIT']] || '').trim() === idLimit) {
          rowIndex = r + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, error: { message: 'ID_LIMIT ' + idLimit + ' tidak ditemukan di Spreadsheet.' } };
      }

      limitSheet.getRange(rowIndex, colMap['STATUS'] + 1).setValue('NONAKTIF');
      limitSheet.getRange(rowIndex, colMap['UPDATED_AT'] + 1).setValue(now);

      return {
        success: true,
        action: 'limit',
        data: {
          message: 'Limit member ' + idLimit + ' berhasil dinonaktifkan.',
          ID_LIMIT: idLimit
        }
      };

    } else if (operation === 'activate') {
      var idLimit = String(body.ID_LIMIT || body.idLimit || '').trim();
      if (!idLimit) {
        return { success: false, error: { message: 'ID_LIMIT wajib diisi untuk mengaktifkan kembali limit.' } };
      }

      var rowIndex = -1;
      var existingRow = null;
      for (var r = 1; r < limitData.length; r++) {
        if (String(limitData[r][colMap['ID_LIMIT']] || '').trim() === idLimit) {
          rowIndex = r + 1;
          existingRow = limitData[r];
          break;
        }
      }

      if (rowIndex === -1 || !existingRow) {
        return { success: false, error: { message: 'ID_LIMIT ' + idLimit + ' tidak ditemukan di Spreadsheet.' } };
      }

      var idMember = String(existingRow[colMap['ID_MEMBER']] || '').trim();
      var idItem = String(existingRow[colMap['ID_ITEM']] || '').trim();

      // Check duplicate active limit
      for (var r = 1; r < limitData.length; r++) {
        var otherId = String(limitData[r][colMap['ID_LIMIT']] || '').trim();
        var otherM = String(limitData[r][colMap['ID_MEMBER']] || '').trim();
        var otherI = String(limitData[r][colMap['ID_ITEM']] || '').trim();
        var otherS = String(limitData[r][colMap['STATUS']] || '').trim().toUpperCase();
        if (otherId !== idLimit && otherM === idMember && otherI === idItem && otherS === 'AKTIF') {
          return {
            success: false,
            error: { message: 'Gagal mengaktifkan: sudah ada MEMBER_LIMIT aktif untuk ' + idMember + ' / ' + idItem + '.' }
          };
        }
      }

      limitSheet.getRange(rowIndex, colMap['STATUS'] + 1).setValue('AKTIF');
      limitSheet.getRange(rowIndex, colMap['UPDATED_AT'] + 1).setValue(now);

      return {
        success: true,
        action: 'limit',
        data: {
          message: 'Limit member ' + idLimit + ' berhasil diaktifkan kembali.',
          ID_LIMIT: idLimit
        }
      };

    } else {
      return { success: false, error: { message: 'Operasi limit tidak dikenal: ' + operation } };
    }

  } catch (err) {
    return {
      success: false,
      error: { message: err.toString() }
    };
  } finally {
    lock.releaseLock();
  }
}

// Inisialisasi struktur sheet standar GudangPresisi v1.2.4
function initSheets() {
  var ss = getSS();
  var schemas = {
    MASTER_ITEM: ['ID_ITEM', 'NAMA_ITEM', 'KATEGORI', 'SATUAN', 'MASA_PAKAI_BULAN', 'STOK_AWAL', 'MIN_STOK', 'LOKASI', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    MASTER_MEMBER: ['ID_MEMBER', 'NAMA_MEMBER', 'JABATAN', 'NO_HP', 'STATUS', 'TANGGAL_MULAI', 'CREATED_AT', 'UPDATED_AT'],
    MEMBER_LIMIT: ['ID_LIMIT', 'ID_MEMBER', 'ID_ITEM', 'MAX_QTY', 'SATUAN', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    TRANSAKSI: ['ID_TRANSAKSI', 'TIMESTAMP', 'TANGGAL', 'ID_ITEM', 'JENIS_TRANSAKSI', 'NO_DOKUMEN', 'JUMLAH', 'SATUAN', 'ID_MEMBER', 'NAMA_MEMBER', 'KETERANGAN', 'CREATED_AT'],
    PENGAJUAN_PENGAMBILAN: ['ID_PENGAJUAN', 'TANGGAL', 'ID_MEMBER', 'ID_ITEM', 'JUMLAH', 'TANGGAL_TERAKHIR_AMBIL', 'TANGGAL_SEHARUSNYA', 'ALASAN', 'STATUS', 'ID_APPROVER', 'CATATAN_APPROVER', 'TIMESTAMP'],
    PENGATURAN: ['KUNCI', 'NILAI', 'DESKRIPSI', 'UPDATED_AT']
  };

  for (var name in schemas) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(schemas[name]);
      sheet.getRange(1, 1, 1, schemas[name].length).setFontWeight('bold');
    }
  }
  return { success: true, message: 'Sheets initialized successfully' };
}
`;
