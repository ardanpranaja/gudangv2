/**
 * Template Code Google Apps Script (GAS) untuk GudangPresisi
 * Dapat disalin ke Apps Script editor di Google Spreadsheet pengguna.
 */
export const GAS_CODE_TEMPLATE = `/**
 * GUDANGPRESISI - BACKEND GOOGLE APPS SCRIPT (GAS)
 * Version: 1.0 LOCKED
 * Database: Google Spreadsheet
 */

const SHEETS = {
  MASTER_ITEM: 'MASTER_ITEM',
  MASTER_MEMBER: 'MASTER_MEMBER',
  MEMBER_LIMIT: 'MEMBER_LIMIT',
  TRANSAKSI: 'TRANSAKSI',
  PENGAJUAN_PENGAMBILAN: 'PENGAJUAN_PENGAMBILAN',
  PENGATURAN: 'PENGATURAN',
  MASTER_MESIN: 'MASTER_MESIN',
  PEMAKAIAN_MESIN: 'PEMAKAIAN_MESIN'
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
      case 'bincard':
        return jsonResponse(handleGetBinCard(e.parameter.itemId));
      case 'memberhistory':
        return jsonResponse(handleGetMemberHistory(e.parameter.memberId));
      case 'pickupeligibility':
        return jsonResponse(handleCheckEligibility(e.parameter.memberId, e.parameter.itemId, Number(e.parameter.qty || 1)));
      case 'requests':
        return jsonResponse(handleGetRequests());
      case 'machines':
        return jsonResponse(handleGetMachines());
      case 'machine_usages':
        return jsonResponse(handleGetMachineUsages());
      case 'debug_transactions':
        return jsonResponse(handleGetTransactions({ limit: 50 }));
      case 'debug_source':
        return jsonResponse(handleDebugSource());
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
      case 'create_item':
        return jsonResponse(handleCreateItem(body));
      case 'update_item':
        return jsonResponse(handleUpdateItem(body));
      case 'create_member':
        return jsonResponse(handleCreateMember(body));
      case 'update_member':
        return jsonResponse(handleUpdateMember(body));
      case 'create_limit':
        return jsonResponse(handleCreateLimit(body));
      case 'create_machine':
        return jsonResponse(handleCreateMachine(body));
      case 'create_machine_usage':
        return jsonResponse(handleCreateMachineUsage(body));
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
    status: 'ONLINE',
    spreadsheetId: ss.getId(),
    sheetsFound: sheets,
    version: '1.0.0-locked',
    timestamp: new Date().toISOString()
  };
}

// Inisialisasi struktur sheet jika baru
function initSheets() {
  var ss = getSS();
  var schemas = {
    MASTER_ITEM: ['ID_ITEM', 'NAMA_ITEM', 'KATEGORI', 'SATUAN', 'MASA_PAKAI_BULAN', 'STOK_AWAL', 'MIN_STOK', 'LOKASI', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    MASTER_MEMBER: ['ID_MEMBER', 'NAMA_MEMBER', 'JENIS_MEMBER', 'NO_HP', 'STATUS', 'TANGGAL_MULAI', 'CREATED_AT', 'UPDATED_AT'],
    MEMBER_LIMIT: ['ID_LIMIT', 'ID_MEMBER', 'ID_ITEM', 'MAX_QTY', 'SATUAN', 'STATUS', 'CREATED_AT', 'UPDATED_AT'],
    TRANSAKSI: ['ID_TRANSAKSI', 'TIMESTAMP', 'TANGGAL', 'ID_ITEM', 'JENIS_TRANSAKSI', 'NO_DOKUMEN', 'JUMLAH', 'ID_MEMBER', 'NAMA_MEMBER', 'KETERANGAN', 'CREATED_AT'],
    PENGAJUAN_PENGAMBILAN: ['ID_PENGAJUAN', 'ID_MEMBER', 'NAMA_MEMBER', 'ID_ITEM', 'NAMA_ITEM', 'JUMLAH', 'ALASAN', 'STATUS', 'APPROVER', 'CATATAN', 'CREATED_AT', 'UPDATED_AT'],
    PENGATURAN: ['KUNCI', 'NILAI', 'DESKRIPSI', 'UPDATED_AT'],
    MASTER_MESIN: ['ID_MESIN', 'NAMA_MESIN', 'KATEGORI', 'MERK', 'MODEL', 'NO_SERI', 'LOKASI', 'KONDISI', 'STATUS', 'TANGGAL_MASUK', 'CREATED_AT', 'UPDATED_AT'],
    PEMAKAIAN_MESIN: ['ID_PEMAKAIAN', 'ID_MESIN', 'ID_MEMBER', 'TANGGAL', 'JAM_MULAI', 'JAM_SELESAI', 'DURASI', 'TUJUAN_PEMAKAIAN', 'LOKASI_PEMAKAIAN', 'KONDISI_SEBELUM', 'KONDISI_SESUDAH', 'KETERANGAN', 'STATUS', 'CREATED_AT', 'UPDATED_AT']
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
