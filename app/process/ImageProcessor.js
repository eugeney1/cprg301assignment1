export async function processImage(imageUrl, options) {
    const { colors, width, height, ppi } = options;
  
    async function getImageData(url) {
      if (url.startsWith('data:image')) {
        return url;
      }
  
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting image:', error);
        throw new Error('Failed to load image: ' + error.message);
      }
    }
  
    try {
      const base64Image = await getImageData(imageUrl);
      console.log('Image converted to base64');
  
      const requestBody = {
        imageData: base64Image,
        colors: parseInt(colors),
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        ppi: ppi ? parseInt(ppi) : 300
      };
  
      console.log('Sending request to API...');
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received response from API');
  
      if (!data.success) {
        throw new Error(data.details || data.error || 'Failed to process image');
      }
  
      return {
        processedImageUrl: data.processedImageUrl,
        palette: data.palette || [],
        success: true
      };
  
    } catch (error) {
      console.error('Error in processImage:', error);
      throw error;
    }
  }