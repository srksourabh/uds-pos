export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}

export async function capturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

export async function scanQRCode(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter serial number or scan QR code';

    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Scan Device</h3>
        <p class="text-sm text-gray-600 mb-4">Enter the device serial number manually or use your camera to scan the QR code.</p>
        <input
          id="qr-input"
          type="text"
          placeholder="Enter serial number..."
          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div class="flex gap-2">
          <button id="qr-cancel" class="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button id="qr-submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Submit</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    const inputEl = dialog.querySelector('#qr-input') as HTMLInputElement;
    inputEl.focus();

    dialog.querySelector('#qr-cancel')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve(null);
    });

    dialog.querySelector('#qr-submit')?.addEventListener('click', () => {
      const value = inputEl.value.trim();
      document.body.removeChild(dialog);
      resolve(value || null);
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const value = inputEl.value.trim();
        document.body.removeChild(dialog);
        resolve(value || null);
      }
    });
  });
}

export function compressImage(base64: string, maxWidth: number = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  });
}

export function getPhotoMetadata() {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
  };
}
