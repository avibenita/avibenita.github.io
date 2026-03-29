/**
 * VB6Communication.js - Shared VB6 Communication Functions
 * 
 * Provides sendToVB6() function for all dashboards to communicate with VB6/Ordo
 * 
 * Usage:
 * <script src="./Ressources/VB6Communication.js"></script>
 * 
 * Then call: sendToVB6('MessageType', data)
 */

function sendToVB6(caseCode, data) {
  try {
    console.log('📤 Sending to VB6 - Case:', caseCode);
    console.log('   Data:', data);
    
    // Use the VB6-injected sendMessageToVB6 function
    if (typeof window.sendMessageToVB6 === 'function') {
      console.log('✅ Found VB6 injected sendMessageToVB6 function');
      window.sendMessageToVB6(caseCode, data);
    } else {
      console.warn('⚠️ window.sendMessageToVB6 not found - VB6 not ready');
    }
  } catch(e) {
    console.error('❌ Error sending to VB6:', e);
  }
}

console.log('✅ VB6Communication.js loaded - sendToVB6 available');

