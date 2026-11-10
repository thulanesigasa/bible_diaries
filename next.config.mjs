const nextConfig={
 output:'standalone',distDir:process.env.APP_BUILD_DIR||'.next',
 async rewrites(){return [{source:'/_expo/:path*',destination:'/_app/_expo/:path*'},{source:'/assets/:path*',destination:'/_app/assets/:path*'}];},poweredByHeader:false,
 async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(),microphone=(),geolocation=()'},{key:'Strict-Transport-Security',value:'max-age=31536000'}]}];}
};
export default nextConfig;
