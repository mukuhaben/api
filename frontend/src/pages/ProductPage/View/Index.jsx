import React, { useState, useEffect } from 'react';
import { productsAPI } from '../../../services/api'; // Adjusted path
import { Container, Grid, Card, CardContent, CardMedia, Typography, CircularProgress, Alert, Box } from '@mui/material';

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productsAPI.getAll();
        if (response.data && response.data.success) {
          setProducts(response.data.data.products);
        } else {
          setError(response.data?.message || 'Failed to fetch products');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching products.');
        console.error("Fetch products error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (products.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">No products found.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Our Products
      </Typography>
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item key={product.id} xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="140"
                image={product.images?.[0]?.image_url || '/placeholder-image.jpg'} // Optional: use a placeholder
                alt={product.product_name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="h2">
                  {product.product_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {product.description}
                </Typography>
                {product.pricing_tiers?.[0]?.selling_price && (
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    Price: {product.pricing_tiers[0].selling_price} 
                    {/* Assuming KES, or make currency dynamic */}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ProductPage;
