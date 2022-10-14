export default `
precision highp float;
#define M_PI 3.1415926535897932384626433832795


in vec3 vNormalWS;
in vec3 vPosition;
out vec4 outFragColor;

struct Material
{
  vec3 albedo;
  float roughness;
  float metallic;
};

struct Light
{
  vec3 position;
  float intensity;
  /* vec3 color; */
};

struct Camera
{
  vec3 position;
};

#define NB_LIGHTS 1
uniform Material uMaterial;
uniform Light uLights[NB_LIGHTS]; 
uniform Camera uCamera;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

// Normal Distribution Function (NDF) to estimate the specular component
float D_GGX(float NoH, float roughness) {
  float a = NoH * roughness;
  float k = roughness / (1.0 - NoH * NoH + a * a);
  return k * k * (1.0 / M_PI);
}

// Geometric Shadowing (micro-facets)
float V_SmithGGXCorrelatedFast(float NoV, float NoL, float roughness) {
  float a = roughness;
  float GGXV = NoL * (NoV * (1.0 - a) + a);
  float GGXL = NoV * (NoL * (1.0 - a) + a);
  //return 0.5 / (GGXV + GGXL);
  return 0.5 / mix(2.0 * (NoL * NoV), NoL + NoV, roughness);
}
float V_SmithGGXCorrelated(float NoV, float NoL, float a) {
    float a2 = a * a;
    float GGXL = NoV * sqrt((-NoL * a2 + NoL) * NoL + a2);
    float GGXV = NoL * sqrt((-NoV * a2 + NoV) * NoV + a2);
    return 0.5 / (GGXV + GGXL);
}
float G_GGX(float NoV, float NoL, float roughness)
{
  float k = roughness;
  float GGXV = NoV / (NoV * ((1.0 - k) + k));
  float GGXL = NoL / (NoL * ((1.0 - k) + k));
  return GGXV + GGXL;
}

// using f90 = 1
vec3 FresnelSchlick(float u, vec3 f0)
{
  float f = pow(1.0 - u, 5.0);
  return f + f0 * (1.0 - f);
}

// ** DIFFUSE BRDF ** //

// Lambertian diffuse optimised | Needs to be multiplied by the albedo to obtain BRDF
// (assuming uniform diffuse response over the micro-facets)
float LambertianBRDF()
{
  return 1.0 / M_PI;
}

// Disney BRDF expressed by Burley
float F_Schlick(float u, float f0, float f90) {
    return f0 + (f90 - f0) * pow(1.0 - u, 5.0);
}

float Fd_Burley(float NoV, float NoL, float LoH, float roughness) {
    float f90 = 0.5 + 2.0 * roughness * LoH * LoH;
    float lightScatter = F_Schlick(NoL, 1.0, f90);
    float viewScatter = F_Schlick(NoV, 1.0, f90);
    return lightScatter * viewScatter * (1.0 / M_PI);
}
// ** ** //



void
main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  #define NB_LIGHTS 1
  vec3 lights[NB_LIGHTS] = vec3[NB_LIGHTS](
    vec3(1.0, 2.0, 3.0)//,
    //vec3(4.0, 0.0, 3.0),
    //vec3(-4.0, 0.0, 3.0),
    //vec3(-1.0, -2.0, 3.0)
    );

  float roughness = uMaterial.roughness * uMaterial.roughness;
  vec3 metallic = vec3(uMaterial.metallic);

  vec3 f0 = mix(metallic, albedo, 0.04);

  vec3 eyeDir = normalize(uCamera.position - vPosition);
  vec3 normal = normalize(vNormalWS);

  float NoV = clamp(dot(normal, eyeDir), 0.0, 1.0);

  vec3 irradiance = vec3(0.0);
  for (int i = 0; i < NB_LIGHTS; i++)
  {
    vec3 lightPos = lights[i];
    vec3 lightDir = normalize(lightPos - vPosition);
    vec3 halfway = normalize(lightDir + eyeDir);

    float NoL = clamp(dot(normal, lightDir), 0.0, 1.0);
    float NoH = clamp(dot(normal, halfway), 0.0, 1.0);
    float LoH = clamp(dot(lightDir, halfway), 0.0, 1.0);
    float LoV = clamp(dot(lightDir, eyeDir), 0.0, 1.0);

    float D = D_GGX(NoH, roughness);
    vec3 kS = normalize(FresnelSchlick(LoV, f0));
    float G = V_SmithGGXCorrelatedFast(NoV, NoL, roughness);

    vec3 DFG = clamp(D * kS * G, 0.0, 1.0);

    vec3 CookTorranceGGXSpecular = DFG / (4.0 * NoV * NoL); 
    vec3 LambertianDiffuse = (1.0 - kS) * LambertianBRDF() * albedo;
    LambertianDiffuse *= (1.0 - metallic);

    //irradiance += (LambertianDiffuse + CookTorranceGGXSpecular) * uLights[i].intensity * NoL;
    //irradiance += (LambertianDiffuse + CookTorranceGGXSpecular) * 1.0 * NoL;
    //irradiance += V_SmithGGXCorrelated(NoV, NoL, roughness);
    irradiance += LambertianDiffuse;
    //irradiance += G;
    //irradiance /= 4.0;
  }


/*
  if (roughness < 0.0)
    albedo = vec3(dot(lightDir, vNormalWS));
  else
    albedo = vec3(D);
*/
  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));

  // To debug normals
  //outFragColor.rgba = LinearTosRGB(vec4(vNormalWS, 1.0));
}
`;