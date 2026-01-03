export async function fetchCategories(search = '', limit = 1000, page = 1, status = '') {
  try {
    const query = `search=${search}&limit=${limit}&page=${page}&status=${status}`;
    const res = await fetch(`/api/categories?${query}`);
    const data = await res.json();
    if (data.success) {
      return data; // Return full response (data + pagination)
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch categories', err);
    return null;
  }
}

export async function fetchProducts(search = '', limit = 1000, page = 1, status = '', select = '') {
  try {
    const query = `search=${search}&limit=${limit}&page=${page}&status=${status}&select=${select}`;
    const res = await fetch(`/api/products?${query}`);
    const data = await res.json();
    if (data.success) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch products', err);
    return null;
  }
}
