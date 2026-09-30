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

// Inisialisasi struktur sheet standar GudangPresisi v1.2.4
function initSheets() {
  var ss = getSS();
  var schemas = {
    MASTER_ITEM: ['ID_ITEM', 'NAMA_ITEM', 'KATEGORI', 'SATUAN', 'MASA_PAKAI_BULAN', 'STOK_AWAL', 'MIN_STOK', 'LOKASI', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    MASTER_MEMBER: ['ID_MEMBER', 'NAMA_MEMBER', 'JABATAN', 'NO_HP', 'STATUS', 'TANGGAL_MULAI', 'CREATED_AT', 'UPDATED_AT'],
    MEMBER_LIMIT: ['ID_LIMIT', 'ID_MEMBER', 'ID_ITEM', 'MAX_QTY', 'SATUAN', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    TRANSAKSI: ['ID_TRANSAKSI', 'TIMESTAMP', 'TANGGAL', 'ID_ITEM', 'JENIS_TRANSAKSI', 'NO_DOKUMEN', 'JUMLAH', 'SATUAN', 'ID_MEMBER', 'NAMA_MEMBER', 'KETERANGAN', 'CREATED_AT'],
    PENGAJUAN_PENGAMBILAN: ['ID_PENGAJUAN', 'ID_MEMBER', 'NAMA_MEMBER', 'ID_ITEM', 'NAMA_ITEM', 'JUMLAH', 'ALASAN', 'STATUS', 'APPROVER', 'CATATAN', 'CREATED_AT', 'UPDATED_AT'],
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
