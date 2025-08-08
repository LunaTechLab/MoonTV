/**
 * 通用的豆瓣数据获取函数
 * @param url 请求的URL
 * @returns Promise<T> 返回指定类型的数据
 */
export async function fetchDoubanData<T>(url: string): Promise<T> {
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 设置请求选项，包括信号和头部
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://movie.douban.com',
    },
  };

  try {
    // 尝试直接访问豆瓣API
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      url
    )}`;
    try {
      const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
      clearTimeout(timeoutId);
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! Status: ${fallbackResponse.status}`);
      }
      const fallbackData = await fallbackResponse.json();
      if (fallbackData && fallbackData.contents) {
        return JSON.parse(fallbackData.contents);
      }
      throw new Error('Invalid fallback response');
    } catch (fallbackError) {
      clearTimeout(timeoutId);
      throw fallbackError;
    }
  }
}
