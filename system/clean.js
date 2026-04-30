import util from 'util';

// Simpan fungsi console asli
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

const filterLogs = (args, originalFunction) => {
    // Ubah semua argumen menjadi string agar mudah dibaca oleh regex/includes
    const message = args.map(arg => typeof arg === 'string' ? arg : util.inspect(arg)).join(' ');

    // 1. Deteksi tumpahan object SessionEntry
    if (message.includes('Closing session: SessionEntry')) {
        originalConsoleInfo('\x1b[33m[SISTEM]\x1b[39m Memperbarui kunci enkripsi sesi...');
        return; 
    }

    if (message.includes('Session error:Error: Bad MAC Error')) {
        originalConsoleInfo('\x1b[33m[SISTEM]\x1b[39m Kunci enkripsi tidak cocok / session tidak sinkron...');
        return; 
    }


    // 2. Blokir log penghapusan sesi lama
    if (message.includes('Removing old closed session')) {
        return; 
    }

    // Jika pesan normal, jalankan seperti biasa
    originalFunction.apply(console, args);
};

// Timpa console bawaan Node.js dengan fungsi filter kita
console.log = (...args) => filterLogs(args, originalConsoleLog);
console.info = (...args) => filterLogs(args, originalConsoleInfo);
console.warn = (...args) => filterLogs(args, originalConsoleWarn);
console.debug = (...args) => filterLogs(args, originalConsoleDebug);