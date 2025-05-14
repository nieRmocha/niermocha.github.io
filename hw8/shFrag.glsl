#version 300 es
precision highp float;

out vec4 FragColor;

in vec3 fragPos;
in vec3 normal;

struct Material {
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

struct Light {
    vec3 direction;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;
uniform int u_toonLevel;

float quantize(float value) {
    float level = float(u_toonLevel);
    float stepSize = 1.0 / level;
    return stepSize * floor(value / stepSize);
}

void main() {
    vec3 norm = normalize(normal);
    vec3 lightDir = normalize(light.direction);
    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);

    vec3 ambient = light.ambient * material.diffuse;

    float diff = max(dot(norm, lightDir), 0.0);
    float quant = quantize(diff);
    vec3 diffuse = light.diffuse * quant * material.diffuse;

    float spec = 0.0;
    if (quant > 0.0) {
        float rawSpec = max(dot(viewDir, reflectDir), 0.0);
        float compressedSpec = pow(rawSpec, material.shininess * 2.0);
        spec = quantize(compressedSpec);
    }
    vec3 specular = light.specular * spec * material.specular;

    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
}
